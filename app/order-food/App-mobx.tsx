/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */
import * as React from 'react';
import './style.css';
import { Checkbox, Button } from 'antd';
import { observer } from 'mobx-react';
import { useState } from 'react';
import { observable, makeObservable, action, computed } from 'mobx';
import { css } from '@emotion/css';

interface Worker {
  name: string;
  groupName: string;
}

interface MealUnit extends Worker {
  isEat: boolean;
}

interface Group<T extends MealUnit> {
  workers: T[];
  name: string;
}

const namesGroup: string[][] = [
  ['沈杰'],
  ['丁淼斌', '肖朋林', '陈悦', '何宇乔', '李之宸', '殷浪浪'],
  ['胡雪纯', '滕志宇', '宋涛', '南天远', '梁怡萍', '伍兵'],
  ['孙霖', '李书志', '刘西腾', '朱成兼', '陈伟', '王佳镐', '房轩宇'],
  ['何季珍', '高然', '覃文韬', '杨乐'],
  ['张裕海', '夏宁一', '岳宗达'],
  [
    '闫雅琨', '张涛', '王国超', '宋夏杰', '姜家明', 
    '曾玲', '杜雅文', '江航旭', '李骁汉', '黄雪锋', '侯崇芊',
  ],
  ['金诗怡', '金茹画', '李依赟', '赵天艺'],
  // ['俞烨波', '龚世维', '赵鸿娇', '谢林宏', '陈宇轩', '史聪毅', '曲源', '杨恩泽', '张强', '于龙飞', '张绍卿', '高屾'],
  // ['周江涵', '吴杉杉', '马春环', '熊婕', '须翎', '王硕文', '彭河', '符英', '翟思琪', '朱颜'],
  // '白佳丽',
  // '杨明天',
  // '罗晨心',
  // '杜晖',
  // '殷立婷',
  // '熊雄',
  // '张峥',

  // '吴哲群'
];

class Worker {
  constructor(public name: string, public groupName: string) {
    makeObservable(this, {});
  }
}

class MealUnit extends Worker {
  constructor(
    public isEat: boolean,
    ...arg: ConstructorParameters<typeof Worker>
  ) {
    super(...arg);
    makeObservable(this, {
      isEat: observable,
      toggleEat: action,
    });
  }

  toggleEat() {
    this.isEat = !this.isEat;
  }
}

class Group<T extends MealUnit> {
  constructor(public workers: T[], public name: string) {
    makeObservable(this, {
      workers: observable,
      name: observable,
      sum: computed,
      num: computed,
      counts: computed,
      checkAll: computed,
      toggleAll: action,
      eatWorkers: computed,
      result: computed,
      emptyEat: action,
      allEat: action,
      setEat: action,
    });
  }

  get sum(): number {
    return this.workers.length;
  }

  get num(): number {
    return this.eatWorkers.length;
  }

  get counts(): string {
    return `${this.num} / ${this.sum}`;
  }

  get checkAll(): boolean {
    return this.num === this.sum;
  }

  toggleAll(): void {
    if (this.checkAll) {
      this.emptyEat();
    } else {
      this.allEat();
    }
  }

  get eatWorkers(): MealUnit[] {
    return this.workers.filter((worker) => worker.isEat);
  }

  get result(): string[] {
    return this.eatWorkers.map((worker) => worker.name);
  }

  emptyEat(): void {
    this.workers.forEach((worker) => {
      worker.isEat = false;
    });
  }

  allEat(): void {
    this.workers.forEach((worker) => {
      worker.isEat = true;
    });
  }

  setEat(names: string[]): void {
    this.workers.forEach((worker) => {
      const index = names.indexOf(worker.name);
      worker.isEat = index !== -1;
    });
  }

  copy(): void {
    const copyStr = this.result.join(', ');
    navigator.clipboard.writeText(copyStr);
  }

  async import(): Promise<void> {
    const text = await navigator.clipboard.readText();
    this.workers.forEach((worker) => {
      if (text.indexOf(worker.name) !== -1) {
        worker.isEat = true;
      }
    })
  }
}

class OvertimeMeal {
  groups: Group<MealUnit>[];

  constructor() {
    this.groups = namesGroup.map((names, index) => {
      const groupNmae = index.toString();

      const workers = names.map((name) => {
        const isEat = false;
        return new MealUnit(isEat, name, groupNmae);
      });

      return new Group<MealUnit>(workers, groupNmae);
    });

    makeObservable(this, {
      groups: observable,
      result: computed,
      resultStr: computed,
    });
  }

  get result(): string[] {
    return [].concat(
      ...this.groups.map((group) => {
        return group.result;
      })
    );
  }

  get resultStr(): string {
    const dateStr = new Date().toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return (
      `${dateStr}\n` +
      `订餐统计:\n` +
      `${this.result.join(', ')}\n` +
      `共${this.result.length}个人`
    );
  }

  copy(): void {
    navigator.clipboard.writeText(this.resultStr);
  }

  empty(): void {
    this.groups.forEach((group) => group.emptyEat());
  }

  async recover(): Promise<void> {
    const regExp = /订餐统计:\n(.*)\n共(.*)个人/;
    const text = await navigator.clipboard.readText();
    const match = text.replace(/\r\n/g, '\n').match(regExp);
    if (match) {
      const names = match[1].split(', ');

      this.groups.forEach((group) => group.setEat(names));
    }
  }

  async import(): Promise<void> {
    const text = await navigator.clipboard.readText();
    this.groups.forEach((group => {
      group.workers.forEach((worker) => {
        if (text.indexOf(worker.name) !== -1) {
          worker.isEat = true;
        }
      })
    }));
  }
}

export default observer(() => {
  const [overtimeMeal] = useState(() => new OvertimeMeal());

  return (
    <div>
      {overtimeMeal.groups.map((group) => {
        return (
          <div>
            <div>-------------------------------------------</div>
            <div>
              <span>
                <Checkbox
                  checked={group.checkAll}
                  onChange={(e) => {
                    group.toggleAll();
                  }}
                >
                  全选
                </Checkbox>
              </span>
              <span>{group.counts}</span>
              <button onClick={group.copy.bind(group)}>复制</button>
              <button onClick={group.import.bind(group)}>录入</button>
            </div>
            <div>
              {group.workers.map((worker) => {
                return (
                  <>
                    <Checkbox
                      checked={worker.isEat}
                      onChange={(e) => {
                        worker.toggleEat();
                      }}
                    >
                      {worker.name}
                    </Checkbox>
                  </>
                );
              })}
            </div>
            {group.result.join(', ')}
          </div>
        );
      })}
      <div
        className={css({
          marginTop: '30px',
        })}
      >
        {overtimeMeal.resultStr}
      </div>

      <Button onClick={overtimeMeal.copy.bind(overtimeMeal)}>复制</Button>
      <Button onClick={overtimeMeal.empty.bind(overtimeMeal)}>清空</Button>
      <Button onClick={overtimeMeal.recover.bind(overtimeMeal)}>复原</Button>
      <Button onClick={overtimeMeal.import.bind(overtimeMeal)}>录入</Button>
    </div>
  );
});

/**
 * 开发备忘录
 * [ ] 数据统计
 * [ ] 统计数据可视化
 * [X] 结果带上日期
 *
 * 数据统计感觉很麻烦就暂时不做
 */
