vars:
  hp = 10
  gold = 0

start {
  "여행자는 하얀 길목에 서 있다."
  "바람이 불고, 두 갈래 길이 앞에 펼쳐진다."
  choices:
    "숲으로 들어간다" -> { dec("hp", 1); jump("forest") }
    "마을로 향한다"   -> { jump("village") }
}

forest {
  if (hp <= 0) jump("gameover")
  "숲은 조용하다. 나뭇잎이 속삭인다."
  "어둠 속에 뭔가 빛나는 게 보인다."
  choices:
    "열매를 따서 먹는다 (HP+1)" -> { inc("hp", 1); jump("start") }
    "더 깊이 들어간다 (HP-2)"   -> { dec("hp", 2); jump("deep") }
}

after_fruit {
  if (hp <= 0) jump("gameover")
  "맛있는 열매를 먹고 여행을 마치고 집으로 돌아간다."
  choices:
    "처음으로 돌아가기" -> { set("hp", 10); set("gold", 0); jump("start") }
}

deep {
  if (hp <= 0) jump("gameover")
  "어둠 속에서 금빛이 번뜩인다."
  "금화 10개가 나뒹굴고 있다."
  choices:
    "금화를 챙긴다" -> { inc("gold", 10); jump("start") }
    "도망친다" ->
      {
        set("hp", 5)
        jump("start")
      }
}

village {
  "마을은 평화롭다. 장터가 북적인다."
  "빵집에서 고소한 냄새가 풍긴다."
  choices:
    "빵을 산다 (gold >= 1)" -> { dec("gold", 1); inc("hp", 2); jump("start") }
    "다시 길로 나온다"       -> { jump("start") }
    "여행을 마치고 집으로 돌아간다" -> { jump("ending") }
}

going_home {
  "맛있는 빵을 먹고 여행을 마치고 집으로 돌아간다."
  "여행은 끝났다."
  "금화 $gold 개를 품에 안고, HP $hp 를 간직한 채 집으로 돌아온다."
  "즐거운 여행이었다."
  choices:
    "처음으로 돌아가기" -> { set("hp", 10); set("gold", 0); jump("start") }
}

ending {
  "여행은 끝났다."
  "금화 $gold 개를 품에 안고, HP $hp 를 간직한 채 집으로 돌아온다."
  "즐거운 여행이었다."
  choices:
    "처음으로 돌아가기" -> { set("hp", 10); set("gold", 0); jump("start") }
}

gameover {
  "여행자는 쓰러졌다. 이야기는 여기서 끝난다."
  choices:
    "처음부터 다시" -> { set("hp", 10); set("gold", 0); jump("start") }
}
