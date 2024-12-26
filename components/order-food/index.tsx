/* eslint-disable @typescript-eslint/no-unsafe-declaration-merging */
import { action, computed, makeObservable, observable } from "mobx";
import { observer } from "mobx-react";
import { useState } from "react";

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

interface Employee {
  name: string;
  order: boolean;
}

interface Group<T extends Employee = Employee> {
  name: string;
  employees: T[];
}

class Employee {
  constructor(public name: string, public order: boolean) {
    makeObservable(this, {
      name: observable,
      order: observable,
      toggleOrder: action,
    })
  }

  toggleOrder() {
    this.order = !this.order;
  }
}

class Group<T extends Employee = Employee> {
  constructor(public name: string, public employees: T[]) {
    makeObservable(this, {
      name: observable,
      employees: observable,
      orderedEmployees: computed,
      sum: computed,
      num: computed,
      counts: computed,
      checkAll: computed,

    })
  }

  get orderedEmployees(): T[] {
    return this.employees.filter(employee => employee.order);
  }

  get sum(): number {
    return this.employees.length;
  }

  get num(): number {
    return this.orderedEmployees.length;
  }

  get counts(): string {
    return `${this.num} / ${this.sum}`;
  }

  get checkAll(): boolean {
    return this.num === this.sum;
  }

  toggleAll(): void {
    if (this.checkAll) {
      this.clearAll();
    } else {
      this.selectAll();
    }
  }

  clearAll(): void {
    this.employees.forEach(employee => employee.order = false);
  }

  selectAll(): void {
    this.employees.forEach(employee => employee.order = true);
  }

  get result(): string[] {
    return this.orderedEmployees.map(employee => employee.name);
  }

  copy(): void {

  }

  async import(): Promise<void> {

  }
}



class OrderList {
  groups: Group[];

  constructor() {
    this.groups = namesGroup.map((names, index) => {
      const groupName = index.toString();

      const employees = names.map(name => new Employee(name, false))

      return new Group(groupName, employees);
    });

    makeObservable(this, {
      groups: observable,
    })
  }
}

export default observer(() => {
  const [orderList] = useState(() => new OrderList());

  return (
    <>
      {
        orderList.groups.map(group => {
          return (
            <div key={group.name}>{group.name}</div>
          )
        })
      }
    </>
  )
})