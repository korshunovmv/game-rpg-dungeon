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

const FEMALE_NAME_FULL = [
  'Арина', 'Тайра', 'Гвена', 'Лиара', 'Мирена', 'Зарина', 'Кора', 'Лорина',
  'Далия', 'Фарина', 'Элина', 'Велия', 'Серена', 'Ульна', 'Харина', 'Ивона',
];

export function generateHeroName(gender = 'male') {
  if (gender === 'female') {
    if (Math.random() < 0.45) {
      return FEMALE_NAME_FULL[randInt(0, FEMALE_NAME_FULL.length - 1)];
    }
    return NAME_STARTS[randInt(0, NAME_STARTS.length - 1)]
      + ['а', 'ия', 'ена', 'ира', 'ель'][randInt(0, 4)];
  }
  if (Math.random() < 0.35) {
    return NAME_FULL[randInt(0, NAME_FULL.length - 1)];
  }
  return NAME_STARTS[randInt(0, NAME_STARTS.length - 1)]
    + NAME_ENDS[randInt(0, NAME_ENDS.length - 1)];
}
