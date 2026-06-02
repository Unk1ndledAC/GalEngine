# 第一章 - Chapter 1

==background: bg_corridor.png==

==bgm: bgm_corridor.ogg==

==show_sprite: alice_smile.png, center==

### 旁白 #

你们一起走出了教室，走廊上的学生们来来往往。

### 爱丽丝 #

对了，中午一起去食堂吗？

?? 你的回答？

- [好啊，一起吧] -> eat_together
- [抱歉，我有点事] -> not_available

## eat_together #

==show_sprite: protagonist_normal.png, left==

### 旁白 #

你点了点头。

### 你 #

好啊，一起去吧。

### 爱丽丝 #

太好了！那我们11点半在教室门口集合！

==set_flag: ate_together = true==

==jump: after_lunch==

## not_available #

==show_sprite: alice_sad.png, center==

### 旁白 #

你摇了摇头，略显抱歉。

### 你 #

抱歉，我有点事……

### 爱丽丝 #

这样啊……那下次再说吧。

==set_flag: ate_together = false==

==jump: after_lunch==
