# 6502编译器插件

## 项目设定

当编译主文件的时候，会在项目目录里面生成 **6502project.json** ，用于对项目进行配置。

* "mainFile": 主文件入口，相对与项目的相对路径，例如："project/main.65s"
* "outType": 输出类型，只有 "Buffer"(二进制) 和 "String"(字符串) 两种类型
* "outFile": 输出文件，若不填则无输出文件，输出文件路径为与项目的相对路径，例如："out/myFile.bin"
* "copyToClipboard": 是否将结果拷贝到剪贴板，true 为拷贝，false 为不拷贝

----

## 功能介绍

#### 数字表示

* $开头的为16进制数，例如：$F
* @开头的为2进制数，例如：@010100
* 正常开头的为10进制数，例如：100

----
#### 标签

* 可以定义任何标签，包括中文标签，例如

![markdown](/image/exp1.png)


* 如果在标签之前加一个点（.），则这个标签的使用范围仅仅为本文件内，这样可以在不同的文件定义相同的标签

![markdown](/image/exp2.png)


* 如果标签以+或-开头，则为临时变量，在例子中，会向上寻找最近的-号标记，同理，会向下寻找最近的++号

![markdown](/image/exp3.png)

----
#### 数据组

* 命令部分新增 `.DBG` `.DWG` 用来作为数据组，例如

![markdown](/image/exp4.png)

* 则 `LDA #my_data_group:data1` 就类似与 `LDA #$0`，即查找data1的所在数据组的位置（从0开始），当然，数据组也正常编译，类似于

![markdown](/image/exp5.png)

----
#### 注释

* 如果标签后有注释，则自动设置为该标签的注释
* 注释部分如果已`;+`开始，`;-`结束，则这一部分可以用做折叠


## 已知问题

* 自定义函数部分的智能提示可能有误
* 自定义函数名称未能显示到智能提示

## 意见

欢迎来提意见 https://github.com/zyr2288/6502-Assembler-For-VSCode/issues
