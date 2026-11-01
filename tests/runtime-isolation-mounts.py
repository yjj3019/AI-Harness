#!/usr/bin/env python3
"""Remount and verify every mount in a bind subtree, using mountinfo.

This is a smoke-test helper, not a security-boundary implementation.
"""
import posixpath
import re
import subprocess
import sys

_ESCAPE = re.compile(r'\\([0-7]{3})')


def unescape(value):
    return _ESCAPE.sub(lambda m: chr(int(m.group(1), 8)), value)


def subtree_entries(lines, root):
    root = posixpath.normpath(root)
    entries = []
    for line in lines:
        fields = line.split()
        if len(fields) < 10 or '-' not in fields:
            raise ValueError('malformed mountinfo')
        path = unescape(fields[4])
        if path == root or path.startswith(root + '/'):
            entries.append((path, frozenset(fields[5].split(','))))
    if not any(path == root for path, _ in entries):
        raise ValueError('missing subtree root mount: ' + root)
    return entries


def read_entries(root):
    with open('/proc/self/mountinfo', encoding='utf-8', errors='surrogateescape') as f:
        return subtree_entries(f, root)


def make_read_only(root):
    entries = read_entries(root)
    # Children first. A path remount reaches only the top of a mount stack;
    # verification includes hidden entries and fails closed if any remain rw.
    # Such stacked-mount environments may therefore be unsupported.
    for path in sorted({p for p, _ in entries}, key=lambda p: p.count('/'), reverse=True):
        subprocess.run(['mount', '-o', 'remount,bind,ro', path], check=True)
    entries = read_entries(root)
    writable = [path for path, options in entries if 'ro' not in options or 'rw' in options]
    if writable:
        raise RuntimeError('writable mounts remain: ' + ', '.join(writable))


if __name__ == '__main__':
    for root in sys.argv[1:]:
        make_read_only(root)
