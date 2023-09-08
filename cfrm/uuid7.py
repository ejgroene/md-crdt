from autotest import get_tester
test = get_tester(__name__)

import uuid
import time
import secrets


version = 7
variant = 2
_last_v7_timestamp = None


class UUID7(uuid.UUID):

    def __init__(self, ns=None, rnd=None):
        """
        https://uuid6.github.io/uuid6-ietf-draft/
         0                   1                   2                   3
         0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1  -bit
        +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
        |                   unix_ts_ms (64 of 96 bits)                  |
        +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+ -96
        |   unix_ts_ms (32 of 96 bits)  |  ver  |   rand_a (12 bits)    |
        +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-80+-+-+-76+-+-+-+-+-+-+-+-+-+-+-+ -64
        |var|                 rand_b (30 of 62 bits)                    |
        +-+-62+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+ -32
        |                     rand_b (32 of 62 bits)                    |
        +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+ -0
        """
        timestamp = ns or time.time_ns()
        rand_a = rnd or secrets.randbits(88)
        rand_b = rand_a >> 12
        super().__init__(int=
            timestamp << 80 & 0xFFFFFFFFFFFF00000000000000000000
            | version << 76 & 0x000000000000F0000000000000000000
            |  rand_a << 64 & 0x0000000000000FFF0000000000000000
            | variant << 62 & 0x0000000000000000B000000000000000
            |  rand_b <<  0 & 0x00000000000000003FFFFFFFFFFFFFFF
        )
    

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
    uid0 = UUID7(ns=1694166297494415134, rnd=79300837436359377954909553)
    test.eq(7, uid0.version)
    uid1 = UUID7(ns=1694179149609449914, rnd=167634973207921400687169493)
    test.isinstance(uid1, UUID7)
    test.lt(uid0, uid1)
    test.eq('urn:uuid:e3458097-e71e-7d71-89b0-2ec7d22b1dda', uid0.urn)
    test.eq('urn:uuid:eef5de58-39ba-7fd5-a161-b59234a237d0', uid1.urn)
    test.lt(uid0.urn, uid1.urn)
