from autotest import get_tester
test = get_tester(__name__)

import uuid
import time
import secrets


"""
https://uuid6.github.io/uuid6-ietf-draft/
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1  -bit
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                   unix_ts_ms (32 of 48 bits)                  |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+ -96
|   unix_ts_ms (16 of 48 bits)  |  ver  |   rand_a (12 bits)    |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-80+-+-+-76+-+-+-+-+-+-+-+-+-+-+-+ -64
|var|                 rand_b (30 of 62 bits)                    |
+-+-62+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+ -32
|                     rand_b (32 of 62 bits)                    |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+ -0
"""

TIMESTAMP_MASK = 0xFFFFFFFFFFFF00000000000000000000
VERSION_MASK   = 0x000000000000F0000000000000000000
RAND_A_MASK    = 0x0000000000000FFF0000000000000000
VARIANT_MASK   = 0x0000000000000000C000000000000000
RAND_B_MASK    = 0x00000000000000003FFFFFFFFFFFFFFF

def shift_count(m):
    return len(bin(m)) - len(bin(m).rstrip('0'))

TIMESTAMP_SHIFT = shift_count(TIMESTAMP_MASK)
VERSION_SHIFT = shift_count(VERSION_MASK)
RAND_A_SHIFT = shift_count(RAND_A_MASK)
VARIANT_SHIFT = shift_count(VARIANT_MASK)
RAND_B_SHIFT = shift_count(RAND_B_MASK)

version = 7
variant = 2
_last_v7_timestamp = None
_last_v7_counter = 0


class UUID7(uuid.UUID):

    def __init__(self, ms=None, rnd=None):
        global _last_v7_timestamp
        global _last_v7_counter
        timestamp = ms or time.time_ns() // 6**10
        if timestamp == _last_v7_timestamp:
            _last_v7_counter += 1
        else:
            _last_v7_counter = 0
        _last_v7_timestamp = timestamp
        rand_a = _last_v7_counter
        rand_b = rnd or secrets.randbits(62)
        super().__init__(int=
            timestamp << TIMESTAMP_SHIFT & TIMESTAMP_MASK
            | version << VERSION_SHIFT & VERSION_MASK
            |  rand_a << RAND_A_SHIFT & RAND_A_MASK
            | variant << VARIANT_SHIFT & VARIANT_MASK
            |  rand_b << RAND_B_SHIFT & RAND_B_MASK
        )

    @property
    def time(self):
        return (self.int & TIMESTAMP_MASK) >> 80
    

@test
def create_uuid7():
    uid0 = UUID7()
    uid1 = UUID7()
    uid2 = UUID7()
    test.isinstance(uid0, UUID7)
    test.isinstance(uid1, UUID7)
    test.isinstance(uid2, UUID7)
    test.eq(7, uid0.version)
    test.eq(7, uid1.version)
    test.eq(7, uid2.version)
    test.eq('specified in RFC 4122', uid0.variant)
    test.eq('specified in RFC 4122', uid1.variant)
    test.eq('specified in RFC 4122', uid2.variant)
    test.gt(uid1, uid0)
    test.gt(uid2, uid1)
    test.gt(uid1.urn, uid0.urn)
    test.gt(uid2.urn, uid1.urn)


@test
def create_known_uuid7():
    uid0 = UUID7(ms=1694166297494, rnd=79300837436359377954909553)
    test.eq(7, uid0.version)
    uid1 = UUID7(ms=1694179149609, rnd=167634973207921400687169493)
    test.isinstance(uid1, UUID7)
    test.lt(uid0, uid1)
    test.eq(1694166297494, uid0.time)
    test.eq(1694179149609, uid1.time)
    test.eq('urn:uuid:018a742e-2b96-7000-82ec-7d22b1ddad71', uid0.urn)
    test.eq('urn:uuid:018a74f2-4729-7000-9b59-234a237d0fd5', uid1.urn)
    test.lt(uid0.urn, uid1.urn)


@test
def create_many_fast():
    import itertools
    ms = time.time_ns() // 2**6
    N = 4096 # 2**12 per ms is max
    a, b = itertools.tee(UUID7(ms=ms) for _ in range(N))
    next(b, None)
    for l, r in zip(a, b):
        test.lt(l, r)
