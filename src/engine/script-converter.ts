const cyrillicToLatin: [string, string][] = [
  ['Љ', 'Lj'], ['љ', 'lj'],
  ['Њ', 'Nj'], ['њ', 'nj'],
  ['Џ', 'Dž'], ['џ', 'dž'],
  ['А', 'A'], ['а', 'a'],
  ['Б', 'B'], ['б', 'b'],
  ['В', 'V'], ['в', 'v'],
  ['Г', 'G'], ['г', 'g'],
  ['Д', 'D'], ['д', 'd'],
  ['Ђ', 'Đ'], ['ђ', 'đ'],
  ['Е', 'E'], ['е', 'e'],
  ['Ж', 'Ž'], ['ж', 'ž'],
  ['З', 'Z'], ['з', 'z'],
  ['И', 'I'], ['и', 'i'],
  ['Ј', 'J'], ['ј', 'j'],
  ['К', 'K'], ['к', 'k'],
  ['Л', 'L'], ['л', 'l'],
  ['М', 'M'], ['м', 'm'],
  ['Н', 'N'], ['н', 'n'],
  ['О', 'O'], ['о', 'o'],
  ['П', 'P'], ['п', 'p'],
  ['Р', 'R'], ['р', 'r'],
  ['С', 'S'], ['с', 's'],
  ['Т', 'T'], ['т', 't'],
  ['Ћ', 'Ć'], ['ћ', 'ć'],
  ['У', 'U'], ['у', 'u'],
  ['Ф', 'F'], ['ф', 'f'],
  ['Х', 'H'], ['х', 'h'],
  ['Ц', 'C'], ['ц', 'c'],
  ['Ч', 'Č'], ['ч', 'č'],
  ['Ш', 'Š'], ['ш', 'š'],
];

const latinToCyrillic: [string, string][] = [
  ['Lj', 'Љ'], ['lj', 'љ'],
  ['LJ', 'Љ'],
  ['Nj', 'Њ'], ['nj', 'њ'],
  ['NJ', 'Њ'],
  ['Dž', 'Џ'], ['dž', 'џ'],
  ['DŽ', 'Џ'],
  ['A', 'А'], ['a', 'а'],
  ['B', 'Б'], ['b', 'б'],
  ['V', 'В'], ['v', 'в'],
  ['G', 'Г'], ['g', 'г'],
  ['D', 'Д'], ['d', 'д'],
  ['Đ', 'Ђ'], ['đ', 'ђ'],
  ['E', 'Е'], ['e', 'е'],
  ['Ž', 'Ж'], ['ž', 'ж'],
  ['Z', 'З'], ['z', 'з'],
  ['I', 'И'], ['i', 'и'],
  ['J', 'Ј'], ['j', 'ј'],
  ['K', 'К'], ['k', 'к'],
  ['L', 'Л'], ['l', 'л'],
  ['M', 'М'], ['m', 'м'],
  ['N', 'Н'], ['n', 'н'],
  ['O', 'О'], ['o', 'о'],
  ['P', 'П'], ['p', 'п'],
  ['R', 'Р'], ['r', 'р'],
  ['S', 'С'], ['s', 'с'],
  ['T', 'Т'], ['t', 'т'],
  ['Ć', 'Ћ'], ['ć', 'ћ'],
  ['U', 'У'], ['u', 'у'],
  ['F', 'Ф'], ['f', 'ф'],
  ['H', 'Х'], ['h', 'х'],
  ['C', 'Ц'], ['c', 'ц'],
  ['Č', 'Ч'], ['č', 'ч'],
  ['Š', 'Ш'], ['š', 'ш'],
];

function applyMapping(text: string, mapping: [string, string][]): string {
  let result = '';
  let i = 0;
  while (i < text.length) {
    let matched = false;
    for (const [from, to] of mapping) {
      if (text.substring(i, i + from.length) === from) {
        result += to;
        i += from.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      result += text[i];
      i++;
    }
  }
  return result;
}

export function toCyrillic(text: string): string {
  return applyMapping(text, latinToCyrillic);
}

export function toLatin(text: string): string {
  return applyMapping(text, cyrillicToLatin);
}

export function isCyrillic(text: string): boolean {
  return /[А-Яа-яЉљЊњЏџЂђЋћЖжЧчШш]/.test(text);
}

export function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ćč]/g, 'c')
    .replace(/š/g, 's')
    .replace(/ž/g, 'z')
    .replace(/đ/g, 'dj')
    .replace(/dž/g, 'dz')
    .trim();
}
