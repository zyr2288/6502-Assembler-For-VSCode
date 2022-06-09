# 6502编译器插件

> 我已放弃更新该版本的更新，新开了一个坑，[新坑地址](https://github.com/zyr2288/zg-assembler)
> 可以在搜索插件 ZG Assembler，该插件能提供更好的体验

[English Version](https://github.com/zyr2288/6502-Assembler-For-VSCode/blob/master/README.en.md)

> 如果新版造成错误过多，请使用老版本，版本0.0.17

## 项目设置
当打开项目文件夹时，会在 **.vscode** 文件夹内生成 **6502-project.json** 文件
```json
{
	"compileTimes": 2,
	"suggestion": true,
	"singleFile": {
		"outFile": "",
		"copyCodeToClipboard": true
	},
	"projects": [
		{
			"name": "project1",
			"entry": "main.65s",
			"includes": [
				"**/*.65s"
			],
			"excludes": [],
			"outFile": "",
			"patchFile": "",
			"copyCodeToClipboard": false
		}
	]
}
```
## 功能介绍
### 编译
在65s文件下的编辑器内，点击鼠标右键则会出现编译菜单。

### 局部标签
若文件内使用标签（非6502编译器指令）以.（点）开头，则该标签的有效范围仅仅于本文件。
这样有利于可以在不同文件使用相同名称的标签。

### 数据组
:（冒号），详情请参阅6502编译器指令的 `.DBG`  `.DWG`  `.ENDD` 命令。

### 注释
;（分号），后面的文字用于注释，这里提供了新的功能：折叠。
折叠功能以 `;+...` 开始， `;-...` 结束，同样，折叠会被视为注释，但是这里可以把代码进行折叠，这样可以省略一些可以不需要查看的代码。

### 简易标签
当标签以全部是+号或全部是-号的时候，则是特殊标签。例如：
```
-       LDA $2002
        BPL -
```
编译结果则为：`AD 02 20 10 FB`。
这里`+`号为向下查找最近的`+`号标记，`-`号为向上查找最近的`-`号标记。
在`++`，`--`后可以添加标签名称，比如`++mark`，这里寓意也是向下查找最近的`++mark`标签。
当然，这里使用+-号可能会比较混乱，建议使用局部变量标签。

----
## 编译器命令 (不区分大小写)
### `.BASE`
> 注意：编译自上而下，一些第一次编译需要赋值的变量如果第一次编译未知则编译不成功。
设置生成文件地址，默认为`.BASE 0`，这里不等同与`.ORG`。
例如：若`.BASE $10`，则生成的文件编译内容从`$10`开始写入，之前的`$F`个地址为`0`。
> 注意：如果使用`.BASE`命令，则在`.ORG`之后，否则编译错误。
---
### `.ORG`
设置开始编译地址，例如：`.ORG $8000`，则编译将从$8000开始。
也可以使用`.ORG *`，表示从当前地址开始编译。不过要知道当前地址，否则编译器报错。
> 注意：如果使用 `.BASE` 命令，则在 `.ORG` 之后，否则编译错误。
---
### `.DEF`
定义一个常量，例如：`.DEF idefined $12`
> 注意：`temp = $12`虽然也能定义，但是可以重复定义。
---
### `.DB`
表示字节，后可以写多个字节。
若字节大于$FF（255），则编译器会报错
例如：
```
    .DB $40, 40, @01010010, >address
```
---
### `.DW`
表示双字节，先低位再高位。
若双字节大于$FFFF(65535)，则编译器会报错
例如：
```
    .DW $40, 60000, @01010101, address
```
---
### `.DBG` `.DWG` `.ENDD`
数据组，用于定位数据位置。
例如：
```
    .DWG data
	.data1, .data2, .data3, .data1
	.ENDD

	LDA data:.data1		;0
	LDA data:.data3     ;2
	LDA data:.data1:1	;3
```
---
### `.HEX`
生成一段16进制数据，可以用空格隔开。
注意：之后只能输入16进制数据，否则编译器会报错。
例如：
```
    .HEX 12 34567 89
```
生成结果为 `12 34 56 07 89`

### `.IF` `.ELSEIF` `.ELSE` `.ENDIF`
这里是一套判断条件，根据条件是否成立是否编译相应内容。
注：必须要在使用这些之前知道参数的信息，否则编译报错
例如：
```
    .IF a == 5
    ...
    .ELSEIF b >= 5
    ...
    .ELSEIF c != 3
    ...
    .ELSE
    ...
    .ENDIF
```

### `.IFDEF` `.IFNDEF`
这里是一套判断条件，根据条件是否成立是否编译相应内容。
用法同 `.IF` 的命令类似，后面可以用 `.ELSE` `.ENDIF`
这里是判断变量是否存在，`.IFDEF`为判断变量是否存在，`.IFNDEF`为判断变量是否不存在。
> 注：必须要在使用这些之前知道参数的信息，否则编译报错

### `.INCBIN`
可以读取引用文件的二进制内容，后面双引号内请填写本文件的相对路径。
例如：
```
    .INCBIN "文件夹\文件.bin"。
```
---
### `.INCLUDE`
可以引用文件，后面双引号内请填写本文件的相对路径。
如果引用文件内也有引用文件，请相对于主编译文件路径填写。
例如：
```
    .INCLUDE "文件夹\文件.65s"。
```
---
### `.MACRO` `.ENDM`
> 用这里的指令可以自定义函数，所要使用的函数要在编译之前定义好，否则编译器会报错。

所有自定义函数内的标签属于局部变量，请勿在函数外部使用。
例如：
```
    .MACRO 参数名 参数1,参数2,参数3... （注：参数个数不限，也可以没有参数，参数之间用逗号隔开）
    ...
    .ENDM
```
如下方法调用： 参数名 参数1,参数2,参数3...

实例1：
```
    .MACRO TXY
    TXA
    TAY
    .ENDM

    TXY
```
编译之后结果为：`8A A8`

实例2：
```
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
```
编译之后结果为：A5 03 A6 04 A5 06 85 06 A4 05

---

### `.REPEAT` `.ENDR`
可以重复某个指令多次，在 `.REPEAT` 后输入表达式即可。
注意：每个 `.REPEAT` 和 `.ENDR` 必须成对出现，可以嵌套。
例如：
```
    .REPEAT 2
    NOP
    .REPEAT 3
    ASL
    .ENDR
    .ENDR
```
对应编译的结果相当于：`NOP ASL ASL ASL NOP ASL ASL ASL`

---
### `.MSG`
编译到这里的时候将会显示对话框。
> 注意：这里所有数字结果将会是10进制呈现，并且.MSG命令后的表达式按照标准进行运算，如果先是字符串相加，则后面的数字将会按照字符串的进行拼接，请注意！

例如：
```
    .ORG $8000
    测试地址1 = $50
    测试地址2 = 50
    .MSG "测试结果：" + (测试地址1 + 测试地址2)
```
这里则会在输出窗口显示 `测试结果：130`
