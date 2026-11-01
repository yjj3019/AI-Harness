#!/usr/bin/env python3
"""Safe offline fixtures; no mounts, namespaces, or network are created."""
import errno
import importlib.util
import sys
from pathlib import Path
import unittest
from unittest import mock

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('mounts', HERE / 'runtime-isolation-mounts.py')
mounts = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mounts)


def entry(mid, parent, path, options):
    return f'{mid} {parent} 0:1 / {path} {options} - tmpfs tmpfs rw\n'


class FixtureTests(unittest.TestCase):
    def test_mountinfo_nested_escaped_and_boundary(self):
        lines = [entry(1, 0, '/target', 'ro'), entry(2, 1, r'/target/a\040b', 'ro'),
                 entry(3, 0, '/target-other', 'rw')]
        self.assertEqual(mounts.subtree_entries(lines, '/target'),
                         [('/target', frozenset(['ro'])), ('/target/a b', frozenset(['ro']))])
        with self.assertRaises(ValueError):
            mounts.subtree_entries(['bad\n'], '/target')
        with self.assertRaises(ValueError):
            mounts.subtree_entries(lines, '/missing')

    def test_nested_remount_and_verify(self):
        before = [('/target', frozenset(['rw'])), ('/target/child', frozenset(['rw']))]
        after = [(p, frozenset(['ro'])) for p, _ in before]
        with mock.patch.object(mounts, 'read_entries', side_effect=[before, after]), \
             mock.patch.object(mounts.subprocess, 'run') as run:
            mounts.make_read_only('/target')
            self.assertEqual(run.call_args_list, [mock.call(['mount', '-o', 'remount,bind,ro', '/target/child'], check=True),
                                                  mock.call(['mount', '-o', 'remount,bind,ro', '/target'], check=True)])
        with mock.patch.object(mounts, 'read_entries', side_effect=[before, before]), \
             mock.patch.object(mounts.subprocess, 'run'):
            with self.assertRaises(RuntimeError):
                mounts.make_read_only('/target')

    def test_stacked_hidden_writable_fails_closed(self):
        before = mounts.subtree_entries([entry(1, 0, '/target', 'rw'),
                                         entry(2, 1, '/target', 'rw')], '/target')
        after = mounts.subtree_entries([entry(1, 0, '/target', 'rw'),
                                        entry(2, 1, '/target', 'ro')], '/target')
        with mock.patch.object(mounts, 'read_entries', side_effect=[before, after]), \
             mock.patch.object(mounts.subprocess, 'run'):
            with self.assertRaises(RuntimeError):
                mounts.make_read_only('/target')

    def test_mountinfo_surrogateescape(self):
        with mock.patch('builtins.open', mock.mock_open(read_data=entry(1, 0, '/target/\udcff', 'ro') + entry(2, 0, '/target', 'ro'))) as opened:
            entries = mounts.read_entries('/target')
        opened.assert_called_once_with('/proc/self/mountinfo', encoding='utf-8', errors='surrogateescape')
        self.assertEqual(entries[0][0], '/target/\udcff')

    def test_write_probe_only_accepts_erofs(self):
        source = (HERE / 'runtime-isolation-linux.sh').read_text(encoding='utf-8')
        probe = source.split('# Same process and credentials:', 1)[1].split('s=socket.socket()', 1)[0]
        probe = '# Same process and credentials:' + probe
        class File:
            def __enter__(self): return self
            def __exit__(self, *args): return False
            def write(self, data): pass
        def run(error, positive_error=None):
            def fake_open(path, mode):
                if path == '/work/positive-control':
                    if positive_error: raise OSError(positive_error, 'control')
                    return File()
                self.assertEqual((path, mode), ('/probe/test', 'x'))
                if error: raise OSError(error, 'probe')
                return File()
            exec(probe, {'open': fake_open, 'errno': errno})
        run(errno.EROFS)
        for error in (errno.EACCES, errno.ENOENT, errno.EEXIST, errno.EIO, None):
            with self.subTest(error=error), self.assertRaises(AssertionError): run(error)
        with self.assertRaises(OSError): run(errno.EROFS, errno.EACCES)


if __name__ == '__main__':
    unittest.main()
