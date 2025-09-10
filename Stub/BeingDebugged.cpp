#include "BeingDebugged.h"
#include "PEB.h"
#include "Obfusheader.h"
BOOL
IsDebuggerPresentPEB(
	VOID
)

/*++

Routine Description:

	Checks if the BeingDebugged flag is set in the Process Environment Block (PEB).
	This is effectively the same code that IsDebuggerPresent() executes internally.
	The PEB pointer is fetched from DWORD FS:[0x30] on x86_32 and QWORD GS:[0x60] on x86_64.

Arguments:

	None

Return Value:

	TRUE - if debugger was detected
	FALSE - otherwise
--*/
{
	PPEB pPeb = NULL;
#if defined (ENV64BIT)
	PPEB pPeb = (PPEB)__readgsqword(OBF((0x60));

#elif defined(ENV32BIT)
	PPEB pPeb = (PPEB)__readfsdword(OBF(0x30));

#endif

	if (pPeb == NULL) {
		return FALSE;  // Return FALSE if the PEB pointer couldn't be retrieved
	}

	return pPeb->BeingDebugged == OBF(1);  // Check the BeingDebugged flag
}
