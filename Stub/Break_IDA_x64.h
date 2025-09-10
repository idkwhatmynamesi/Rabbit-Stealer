#ifndef BRKIDA_HPP
#define BRKIDA_HPP
// credits to a guy on github his repo is named BRKIDA 
#if _MSC_VER && _WIN64 == 1 // only implemented for MSVC and x64 for now
#include <intrin.h> // __AddressOfReturnAddress

// very simple compile-time hash algorithm for binary randomness
unsigned constexpr long long const_hash(const char* input) {
    return *input ? static_cast<unsigned long long>(*input) + 33 * const_hash(input + 1) : 5381;
}

/*
* stub proc
* jmp useless ; E8 08
* mov [rsp + BIGINT_HERE], rcx; this will never be executed (48 89 8C 24 DE AD BE EF)
* useless:
* ret ; C3
* stub endp
*/

#define BRKIDA \
{ \
    constexpr unsigned __int8 stub[] = { \
        0xEB, 0x08, /* jmp 0x8 */ \
        0x48, 0x89, 0x8C, 0x24, /* mov [rsp + ????????], rcx */ \
        unsigned __int8((const_hash(__DATE__ __TIME__) + __COUNTER__ * __COUNTER__) % 0xFF /* mod of max uint8_t */), \
        unsigned __int8((const_hash(__DATE__ __TIME__) + __COUNTER__ * __COUNTER__) % 0xFF /* mod of max uint8_t */), \
        unsigned __int8((const_hash(__DATE__ __TIME__) + __COUNTER__ * __COUNTER__) % 0xFF /* mod of max uint8_t */), \
        unsigned __int8((const_hash(__DATE__ __TIME__) + __COUNTER__ * __COUNTER__) % 0xFF /* mod of max uint8_t */), \
        0x90, /* NOP (added to confuse disassemblers further) */ \
        0x90, /* Another NOP */ \
        0xC3, /* ret */ \
        0xFF, 0x25, 0xDE, 0xAD, 0xBE, 0xEF, /* jmp to invalid address 0xDEADBEAF (Random jump) */ \
    }; \
    \
    /* we don't want to execute the stub because we don't even change the protection to executable so it would crash */ \
    if (!_AddressOfReturnAddress()) { \
        ((void(*)())uintptr_t(stub))(); \
        ((void(*)())uintptr_t(0x0))(); /* a call to 0x0 sometimes breaks ida decompiler too */ \
        /* Call a random invalid address to confuse Binary Ninja as well */ \
        ((void(*)())uintptr_t(0xDEADBEAF))(); \
    } \
}
#else
#define BRKIDA
#error("BRKIDA is currently only supported on MSVC x64")
#endif

#endif // include guard
