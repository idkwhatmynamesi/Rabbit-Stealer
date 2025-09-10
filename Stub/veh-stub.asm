.data
	name db 'sigma',0

.code 
	RIP PROC
		nop
		mov eax,ebx
		mov ebx,edx
		mov ebx,eax
		nop
		mov edx,ebx
		ret
	RIP ENDP
end