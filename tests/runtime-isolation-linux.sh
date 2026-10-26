#!/usr/bin/env bash
set -euo pipefail
root=$(mktemp -d)
trap 'rm -rf "$root"' EXIT
mkdir -p "$root/root" "$root/work" "$root/protected"
chmod 0777 "$root/work"
printf 'CANARY-UNCHANGED\n' > "$root/protected/canary"
printf 'ALLOWED-INPUT\n' > "$root/work/input"
ln -s "$root/protected/canary" "$root/work/escape"
cat >"$root/work/check.py" <<'PY'
import os, socket, errno
assert open('/work/input').read() == 'ALLOWED-INPUT\n'
with open('/work/out', 'w') as f: f.write('AUTHORIZED')
assert not os.path.exists('/work/escape'), 'Escaped through symlink'
assert not os.path.exists('/protected/canary'), 'Saw protected host file'
try:
    with open('/usr/.harness-escape-test', 'w') as f: f.write('overwrite')
    raise AssertionError('System bind writable!')
except OSError as exc: print('DENIED_READ_ONLY', exc.errno)
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
mkdir -p "$ROOTFS/usr" "$ROOTFS/bin" "$ROOTFS/lib" "$ROOTFS/lib64" "$ROOTFS/work" "$ROOTFS/tmp"
for p in usr bin lib lib64; do
  mount --rbind "/$p" "$ROOTFS/$p"
  mount -o remount,bind,ro "$ROOTFS/$p"
done
mount --bind "$WORKSPACE" "$ROOTFS/work"
chroot "$ROOTFS" /usr/bin/env -i PATH=/usr/bin:/bin /usr/bin/python3 /work/check.py
SH
if unshare --user --map-root-user --mount --net --fork /bin/true >/dev/null 2>&1; then
  env -i PATH=/usr/sbin:/usr/bin:/bin ROOTFS="$root/root" WORKSPACE="$root/work" unshare --user --map-root-user --mount --net --fork /bin/bash "$root/inside.sh"
elif command -v sudo >/dev/null 2>&1 && sudo unshare --mount --net --fork /bin/true >/dev/null 2>&1; then
  sudo env -i PATH=/usr/sbin:/usr/bin:/bin ROOTFS="$root/root" WORKSPACE="$root/work" unshare --mount --net --fork /bin/bash "$root/inside.sh"
else
  echo "ISOLATION_BLOCKED: no permitted user/mount/network namespaces; fail closed" >&2
  exit 2
fi
test "$(cat "$root/work/out")" = "AUTHORIZED"
test "$(cat "$root/protected/canary")" = "CANARY-UNCHANGED"
echo HOST_POST_CHECK_PASS
