import { randInt } from './utils.js';

const NAME_STARTS = [
  'Ар', 'Бор', 'Вол', 'Гар', 'Ден', 'Зар', 'Кор', 'Лор', 'Мир', 'Тал',
  'Тор', 'Фар', 'Эр', 'Ор', 'Рен', 'Сер', 'Уль', 'Хар', 'Ив', 'Кел',
];

const NAME_ENDS = [
  'ион', 'вар', 'вин', 'дор', 'лас', 'фен', 'мар', 'ен', 'ан', 'ор',
  'ель', 'ик', 'ард', 'оль', 'ун', 'ис', 'ал', 'ек', 'ин', 'ус',
];

const NAME_FULL = [
  'Арион', 'Торвин', 'Гарен', 'Мирон', 'Зарек', 'Корвус', 'Лорен',
  'Дариус', 'Фарион', 'Эриус', 'Вольгар', 'Сергард', 'Ульрик', 'Харон',
  'Ивар', 'Ренгар', 'Талвор', 'Борис', 'Орвин', 'Зенон',
];

export function generateHeroName() {
  if (Math.random() < 0.35) {
    return NAME_FULL[randInt(0, NAME_FULL.length - 1)];
  }
  return NAME_STARTS[randInt(0, NAME_STARTS.length - 1)]
    + NAME_ENDS[randInt(0, NAME_ENDS.length - 1)];
}
