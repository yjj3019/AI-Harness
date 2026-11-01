#!/usr/bin/env bash
set -euo pipefail
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
root=$(mktemp -d)
trap 'rm -rf "$root"' EXIT
# mountinfo reports physical paths even when TMPDIR contains a symlink.
root=$(CDPATH= cd -P -- "$root" && pwd -P)
mkdir -p "$root/root" "$root/work" "$root/protected" "$root/probe"
chmod 0777 "$root/work" "$root/probe"
printf 'CANARY-UNCHANGED\n' > "$root/protected/canary"
printf 'ALLOWED-INPUT\n' > "$root/work/input"
ln -s "$root/protected/canary" "$root/work/escape"
cat >"$root/work/check.py" <<'PY'
import os, socket, errno
assert open('/work/input').read() == 'ALLOWED-INPUT\n'
with open('/work/out', 'w') as f: f.write('AUTHORIZED')
assert not os.path.exists('/work/escape'), 'Escaped through symlink'
assert not os.path.exists('/protected/canary'), 'Saw protected host file'
# Same process and credentials: prove creation works before interpreting denial.
with open('/work/positive-control', 'x') as f: f.write('CONTROL')
try:
    # Only probe a disposable bind of a fresh temporary directory, never host /usr.
    with open('/probe/test', 'x') as f: f.write('overwrite')
except OSError as exc:
    assert exc.errno == errno.EROFS, ('unexpected write error', exc.errno)
    print('DENIED_READ_ONLY', exc.errno)
else:
    raise AssertionError('Disposable read-only probe bind writable!')
# No network positive control: routing or firewall state may also cause this error.
s=socket.socket(); s.settimeout(2)
code=s.connect_ex(('1.1.1.1',443))
print('NET_ERRNO',code)
assert code in (errno.ENETUNREACH,errno.EHOSTUNREACH), code
print('SANDBOX_CHECK_PASS')
PY
chmod 0644 "$root/work/check.py"
cat >"$root/inside.sh" <<'SH'
set -euo pipefail
mount --make-rprivate /
mount -t tmpfs tmpfs "$ROOTFS"
mkdir -p "$ROOTFS/usr" "$ROOTFS/bin" "$ROOTFS/lib" "$ROOTFS/lib64" "$ROOTFS/work" "$ROOTFS/probe" "$ROOTFS/tmp"
for p in usr bin lib lib64; do
  mount --rbind "/$p" "$ROOTFS/$p"
done
mount --bind "$PROBE" "$ROOTFS/probe"
/usr/bin/python3 "$MOUNT_HELPER" "$ROOTFS/usr" "$ROOTFS/bin" "$ROOTFS/lib" "$ROOTFS/lib64" "$ROOTFS/probe"
mount --bind "$WORKSPACE" "$ROOTFS/work"
chroot "$ROOTFS" /usr/bin/env -i PATH=/usr/bin:/bin /usr/bin/python3 /work/check.py
SH
if unshare --user --map-root-user --mount --net --fork /bin/true >/dev/null 2>&1; then
  env -i PATH=/usr/sbin:/usr/bin:/bin ROOTFS="$root/root" WORKSPACE="$root/work" PROBE="$root/probe" MOUNT_HELPER="$script_dir/runtime-isolation-mounts.py" unshare --user --map-root-user --mount --net --fork /bin/bash "$root/inside.sh"
elif [ "$(id -u)" -eq 0 ] && unshare --mount --net --fork /bin/true >/dev/null 2>&1; then
  env -i PATH=/usr/sbin:/usr/bin:/bin ROOTFS="$root/root" WORKSPACE="$root/work" PROBE="$root/probe" MOUNT_HELPER="$script_dir/runtime-isolation-mounts.py" unshare --mount --net --fork /bin/bash "$root/inside.sh"
elif command -v sudo >/dev/null 2>&1 && sudo -n unshare --mount --net --fork /bin/true >/dev/null 2>&1; then
  sudo -n env -i PATH=/usr/sbin:/usr/bin:/bin ROOTFS="$root/root" WORKSPACE="$root/work" PROBE="$root/probe" MOUNT_HELPER="$script_dir/runtime-isolation-mounts.py" unshare --mount --net --fork /bin/bash "$root/inside.sh"
else
  echo "ISOLATION_BLOCKED: no permitted user/mount/network namespaces; fail closed" >&2
  exit 2
fi
test "$(cat "$root/work/out")" = "AUTHORIZED"
test "$(cat "$root/protected/canary")" = "CANARY-UNCHANGED"
echo HOST_POST_CHECK_PASS
