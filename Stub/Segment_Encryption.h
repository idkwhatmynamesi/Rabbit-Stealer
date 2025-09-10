#pragma once
#include <Windows.h>
#include "Obfusheader.h"
#include "Break_IDA_x64.h"

#define USE_XOR_ENCRYPTION TRUE
// credits to c5hcker on github
// awesome, but has cpu overruns not really safe, should make it better if you wanna use it
#if USE_XOR_ENCRYPTION
unsigned char xor_key[] = {
	'Y', 'w', 'A', 'Y', 'w', 'A', 'o', 'n', 'v', 's', 'g', 'H', 'U', 'b', 'n', 'o',
	'Y', 'w', 'A', 'o', 'n', 'v', 's', 'g', 'H', 'U', 'b', 'n', 'n', 'v', 's', 'g',
	'H', 'U', 'b', 'n'
};
size_t xor_key_size = sizeof(xor_key) / sizeof(xor_key[0]);
#endif

typedef struct {
	uintptr_t FunctionAddress;
	uintptr_t ReturnAddress;
	__int64 functionSize;
	char* originalInstructions;
	BOOL IsJMPReturn;
} EncryptedFunctionList;

EncryptedFunctionList* EncryptedFunctions = NULL;
size_t num_EncryptedFunctions = 0;

BOOL EncryptHandlerInitialized = FALSE;

#define CALL_FUNCTION_SAFE(ptr, args) ((void*(*)(va_list))(ptr))(args)

#pragma optimize("", off)
__declspec(dllexport) void* EndSED(void* returnValue)
{
	return returnValue;
}
#pragma optimize("", on)

#if USE_XOR_ENCRYPTION
void xor_encrypt(unsigned char* data, size_t data_len, unsigned char* key, size_t key_len)
{
	for (size_t i = 0; i < data_len; i++)
	{
		data[i] ^= key[i % key_len];
	}
}

void xor_decrypt(unsigned char* data, size_t data_len, unsigned char* key, size_t key_len)
{
	for (size_t i = 0; i < data_len; i++)
	{
		data[i] ^= key[i % key_len];
	}
}
#endif

PVOID VxMoveMemory(PVOID dest, const PVOID src, SIZE_T len) {
	char* d = (char*)dest;
	const char* s = (const char*)src;
	while (len--)
		*d++ = *s++;
	return dest;
}

__declspec(noinline) void EncryptCodeSection(LPVOID address, char* originalInstructions, int SIZE_OF_FUNCTION)
{
	VxMoveMemory(originalInstructions, address, SIZE_OF_FUNCTION);
#if USE_XOR_ENCRYPTION
	xor_encrypt((unsigned char*)originalInstructions, SIZE_OF_FUNCTION, xor_key, xor_key_size);
#endif
	DWORD oldProtect;
	CALL_EXPORT(L"kernel32.dll", "VirtualProtect", BOOL(WINAPI*)(LPVOID, SIZE_T, DWORD, PDWORD), address, SIZE_OF_FUNCTION, PAGE_EXECUTE_READWRITE, &oldProtect);
	for (int i = 0; i < SIZE_OF_FUNCTION; i++)
	{
#if _WIN64
		* ((char*)((uintptr_t)address + i)) = 0x1F;
#else
		* ((char*)((uintptr_t)address + i)) = 0xFE;
#endif
	}
	CALL_EXPORT(L"kernel32.dll", "VirtualProtect", BOOL(WINAPI*)(LPVOID, SIZE_T, DWORD, PDWORD), address, SIZE_OF_FUNCTION, oldProtect, &oldProtect);
}


__declspec(noinline) BOOL SetBreakpoint(LPVOID address)
{
	DWORD oldProtect;
	CALL_EXPORT(L"kernel32.dll", "VirtualProtect", BOOL(WINAPI*)(LPVOID, SIZE_T, DWORD, PDWORD), address, sizeof(char), PAGE_EXECUTE_READWRITE, &oldProtect);
	*((char*)address) = 0xCC;
	CALL_EXPORT(L"kernel32.dll", "VirtualProtect", BOOL(WINAPI*)(LPVOID, SIZE_T, DWORD, PDWORD), address, sizeof(char), oldProtect, &oldProtect);
	return TRUE;
}

__declspec(noinline) LONG WINAPI VEHDecryptionHandler(PEXCEPTION_POINTERS exceptions)
{
	if (exceptions->ExceptionRecord->ExceptionCode == EXCEPTION_ILLEGAL_INSTRUCTION)
	{
		for (size_t i = 0; i < num_EncryptedFunctions; i++)
		{
			if ((uintptr_t)((uintptr_t)exceptions->ExceptionRecord->ExceptionAddress) == (uintptr_t)EncryptedFunctions[i].FunctionAddress)
			{
				DWORD oldProtect;
				CALL_EXPORT(L"kernel32.dll", "VirtualProtect", BOOL(WINAPI*)(LPVOID, SIZE_T, DWORD, PDWORD),
					(LPVOID)EncryptedFunctions[i].FunctionAddress, EncryptedFunctions[i].functionSize, PAGE_EXECUTE_READWRITE, &oldProtect);
#if USE_XOR_ENCRYPTION
				xor_decrypt((unsigned char*)EncryptedFunctions[i].originalInstructions, EncryptedFunctions[i].functionSize, xor_key, xor_key_size);
#endif
				VxMoveMemory((LPVOID)EncryptedFunctions[i].FunctionAddress, EncryptedFunctions[i].originalInstructions, EncryptedFunctions[i].functionSize);
				CALL_EXPORT(L"kernel32.dll", "VirtualProtect", BOOL(WINAPI*)(LPVOID, SIZE_T, DWORD, PDWORD),
					(LPVOID)EncryptedFunctions[i].FunctionAddress, EncryptedFunctions[i].functionSize, oldProtect, &oldProtect);
				SetBreakpoint((LPVOID)EncryptedFunctions[i].ReturnAddress);
				return EXCEPTION_CONTINUE_EXECUTION;
			}
		}
		return EXCEPTION_CONTINUE_SEARCH;
	}
	else if (exceptions->ExceptionRecord->ExceptionCode == EXCEPTION_BREAKPOINT)
	{
		for (size_t i = 0; i < num_EncryptedFunctions; i++)
		{
			if ((uintptr_t)((uintptr_t)exceptions->ExceptionRecord->ExceptionAddress) == (uintptr_t)EncryptedFunctions[i].ReturnAddress)
			{
				DWORD oldProtect;
				CALL_EXPORT(L"kernel32.dll", "VirtualProtect", BOOL(WINAPI*)(LPVOID, SIZE_T, DWORD, PDWORD),
					exceptions->ExceptionRecord->ExceptionAddress, EncryptedFunctions[i].functionSize, PAGE_EXECUTE_READWRITE, &oldProtect);
				if (EncryptedFunctions[i].IsJMPReturn)
				{
					*((char*)exceptions->ExceptionRecord->ExceptionAddress) = 0xE9;
				}
				else
				{
					*((char*)exceptions->ExceptionRecord->ExceptionAddress) = 0xE8;
				}
				CALL_EXPORT(L"kernel32.dll", "VirtualProtect", BOOL(WINAPI*)(LPVOID, SIZE_T, DWORD, PDWORD),
					exceptions->ExceptionRecord->ExceptionAddress, EncryptedFunctions[i].functionSize, oldProtect, &oldProtect);
				EncryptCodeSection((LPVOID)EncryptedFunctions[i].FunctionAddress, EncryptedFunctions[i].originalInstructions, EncryptedFunctions[i].functionSize);
				return EXCEPTION_CONTINUE_EXECUTION;
			}
		}
		return EXCEPTION_CONTINUE_SEARCH;
	}
	else
	{
		return EXCEPTION_CONTINUE_SEARCH;
	}
}

CRITICAL_SECTION cs;

__declspec(noinline) void EncryptFunction(uintptr_t functionPointer)
{
	if (!EncryptHandlerInitialized)
	{
		InitializeCriticalSection(&cs);
		xor_key_size = strlen((char*)xor_key);
		EncryptHandlerInitialized = TRUE;
		AddVectoredExceptionHandler(1, &VEHDecryptionHandler);
	}
	num_EncryptedFunctions++;
	EncryptedFunctions = (EncryptedFunctionList*)realloc(EncryptedFunctions, num_EncryptedFunctions * sizeof(EncryptedFunctionList));
	EncryptedFunctionList* currentHookInfo = &EncryptedFunctions[num_EncryptedFunctions - 1];
	int SIZE_OF_FUNCTION = 0;
	unsigned char* current_address = (unsigned char*)((void*)functionPointer);
	while (TRUE)
	{
		BYTE* ptr = (BYTE*)current_address;
		if (ptr[0] == 0xE9 && *((DWORD*)(current_address + 1)) == ((DWORD)EndSED - ((DWORD)current_address + 5)))
		{
			currentHookInfo->IsJMPReturn = TRUE;
			currentHookInfo->ReturnAddress = (uintptr_t)current_address;
			break;
		}
		else if (ptr[0] == 0xE8 && *((DWORD*)(current_address + 1)) == ((DWORD)EndSED - ((DWORD)current_address + 5)))
		{
			currentHookInfo->IsJMPReturn = FALSE;
			currentHookInfo->ReturnAddress = (uintptr_t)current_address;
			break;
		}
		current_address++;
		SIZE_OF_FUNCTION++;
	}
	currentHookInfo->FunctionAddress = functionPointer;
	currentHookInfo->functionSize = SIZE_OF_FUNCTION;
	currentHookInfo->originalInstructions = (char*)malloc(SIZE_OF_FUNCTION * sizeof(char));
	VxMoveMemory(currentHookInfo->originalInstructions, (void*)functionPointer, SIZE_OF_FUNCTION);
	EncryptCodeSection((LPVOID)functionPointer, currentHookInfo->originalInstructions, SIZE_OF_FUNCTION);
}

__declspec(noinline) void* CallFunction(void* ptr, ...)
{
	BRKIDA;
	EnterCriticalSection(&cs);
	va_list args;
	va_start(args, ptr);
	void* returnValue = CALL_FUNCTION_SAFE(ptr, args);
	va_end(args);
	LeaveCriticalSection(&cs);
	return returnValue;
}
