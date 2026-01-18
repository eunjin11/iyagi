import type { Story } from '../story/types';

// 임시 데모 데이터: 실제 변환 전까지 UI/엔진 동작 확인용
export const demoStory: Story = {
  title: '여행',
  start: 'start',
  init: { hp: 10, gold: 0 },
  passages: {
    start: {
      id: 'start',
      text:
        '여행자는 하얀 길목에 서 있다. 어디로 갈까?',
      choices: [
        { text: '숲으로 들어간다', goto: 'forest', do: [{ type: 'dec', key: 'hp', by: 1 }] },
        { text: '마을로 향한다', goto: 'village' }
      ]
    },
    forest: {
      id: 'forest',
      text:
        '숲은 조용하다. 나뭇잎이 속삭인다.',
      choices: [
        { text: '열매를 따서 먹는다(HP+1)', goto: 'start', do: [{ type: 'inc', key: 'hp', by: 1 }] },
        { text: '더 깊이 간다(HP-2)', goto: 'deep', do: [{ type: 'dec', key: 'hp', by: 2 }] }
      ]
    },
    deep: {
      id: 'deep',
      text:
        '어둠 속에서 금빛이 번뜩인다.',
      choices: [
        { text: '금화를 챙긴다', goto: 'start', do: [{ type: 'inc', key: 'gold', by: 10 }] },
        { text: '도망친다', goto: 'start' }
      ]
    },
    village: {
      id: 'village',
      text:
        '마을은 평화롭다. 장터가 북적인다.',
      choices: [
        { text: '빵을 산다(gold>=1)', goto: 'start', do: [{ type: 'dec', key: 'gold', by: 1 }], if: [{ key: 'gold', op: 'gte', value: 1 }] },
        { text: '다시 길로 나온다', goto: 'start' }
      ]
    }
  }
};


