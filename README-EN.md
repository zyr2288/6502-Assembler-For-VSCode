6502 compiler plugin
Project settings
When compiling the main file, 6502project.json will be generated in the project directory to configure the project.

"mainFile": main file entry, relative path relative to the project, for example: "project / main.65s"
"outType": output type, only "Buffer" (binary) and "String" (string)
"outFile": output file, if there is no output file, the output file path is relative to the project, for example: "out / myFile.bin"
"copyToClipboard": whether to copy the result to the clipboard, true for copying, false for not copying
Features
Local label
If a tag (not a 6502 compiler directive) is used in the file that starts with. (Dot), the valid range of the tag is only in this file. This facilitates the use of tags with the same name in different files.

Data set
:( colon) Please refer to the 6502 compiler directive .DBG .DWG .ENDDcommands.

Comment
; (Semicolon), the following text is used for comments, here is a new feature: folding. Folding function to ;+...start, ;-...end, too, folding is treated as a comment, but here the code folding, so you can omit some of the code may not need to see.

Simple label
　　When the label is all + signs or all-signs, it is a special label. E.g:

-   LDA $2002
    BPL -

Compile the results AD 02 20 10 FBwas: . Here the +number is to find the nearest +number mark downwards , and the -number is to find the nearest -number mark upwards . After ++, --you can add the label name. For example ++mark, the implication here is to find the nearest ++marklabel. Of course, using the +-sign here may be confusing, it is recommended to use local variable labels.


6502 compiler instructions

.BASE
Note: The compilation is from top to bottom. Some variables that need to be assigned for the first compilation will fail if the first compilation is unknown.
Set the generated file address. The default is .BASE 0not the same here .ORG. For example: if .BASE $10, the compiled content of the generated file is $10written from the beginning, the previous $Faddress is 0.
Note: If you use the .BASEcommand, it is .ORGafter, otherwise the compilation error.

.DB
Represents bytes. Multiple bytes can be written after. If the byte is greater than $ FF (255), the compiler will report an error. For example:
    .DB $40, 40, @01010010, >address

.DW
Represents double-byte, first low and then high. If the double byte is greater than $ FFFF (65535), the compiler will report an error. For example:
    .DW $40, 60000, @01010101, address

.HEX
Generate a piece of hexadecimal data, which can be separated by spaces. Note: You can only enter hexadecimal data later, otherwise the compiler will report an error. E.g:

    .HEX 12 34567 89
The result is 12 34 56 07 89

.IF .ELSEIF .ELSE .ENDIF
Here is a set of judgment conditions, according to whether the conditions are true and whether to compile the corresponding content. Note: You must know the parameter information before using these, otherwise the compiler will report an error. For example:
    .IF a == 5
    ...
    .ELSEIF b >= 5
    ...
    .ELSEIF c != 3
    ...
    .ELSE
    ...
   .ENDIF
.IFDEF .IFNDEF
Here is a set of judgment conditions, according to whether the conditions are true and whether to compile the corresponding content. Use the same .IFcommand Similarly, the back can .ELSE .ENDIF here be determined whether there is a variable, .IFDEFto judge whether there is a variable, .IFNDEFto judge whether the variable does not exist.

Note: you must know the parameter information before using these, otherwise the compiler will report an error

.INCBIN
You can read the binary content of the reference file. Please fill in the relative path of the file in the double quotes. E.g:
    .INCBIN "Folder \ file.bin"。
    
.INCLUDE
You can quote the file, please fill in the relative path of the file in double quotes. If there are also reference files in the reference file, please fill in relative to the main compilation file path. E.g:
    .INCLUDE "Folder \ file.65s"。
    
.MACRO .ENDM
Use the instructions here to customize functions. The functions to be used must be defined before compilation, otherwise the compiler will report an error.
All tags in custom functions are local variables. Do not use them outside the function. E.g:

.MACRO parameter name parameter1,parameter2,parameter3... （Note： There is no limit to the number of parameters, and there can be no parameters. The parameters are separated by commas）
    ...
    .ENDM
Called as follows: parameter name parameter 1, parameter 2, parameter 3 ...

Example 1:

    .MACRO TXY
    TXA
    TAY
    .ENDM

    TXY
The result after compilation is:8A A8

Example 2:

    .MACRO test a,b
    .IF 3 == a
    LDA 3
    .ELSEIF 4 == a
    LDX 4
    .ELSEIF 5 == a && 5 == b
    LDY 5
    .ELSE
    LDA 6
    STA 6
    .ENDIF
    .ENDM

    test 3,3
    test 4,3
    test 5,4
    test 5,5
The result after compilation is:A5 03 A6 04 A5 06 85 06 A4 05

.ORG
Set the start compilation address, for example:, .ORG $8000the compilation will start from $ 8000. It can also be used to .ORG *start compilation from the current address. However, you must know the current address, otherwise the compiler will report an error.

Note: If you use the .BASEcommand, then .ORGafter, otherwise compilation errors.

.REPEAT .ENDR
An instruction can be repeated many times in .REPEATthe input expression can be. Note: Each .REPEATand .ENDRmust appear in pairs, you can be nested. E.g:

    .REPEAT 2
    NOP
    .REPEAT 3
    ASL
    .ENDR
    .ENDR
The corresponding compilation result is equivalent to:NOP ASL ASL ASL NOP ASL ASL ASL

.MSG
A dialog box will be displayed when compiling here.

Note: All numerical results here will be presented in decimal, and the expressions after the .MSG command will be calculated according to the standard. If the strings are added first, the subsequent numbers will be stitched according to the string. Please note!

E.g:

    .ORG $8000
    Test address1 = $50
    Test address2 = 50
    .MSG "Test Results :" + (Test address1 + Test address2)
Here it will be displayed in the output window Test Results：130

Opinion
Welcome to comment https://github.com/zyr2288/6502-Assembler-For-VSCode/issues
