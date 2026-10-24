import type { ImageSourcePropType } from 'react-native';

import type { Store, StoreCategory } from './mock-floor';

/* eslint-disable @typescript-eslint/no-require-imports */
const IMG = {
  atm: require('../assets/images/stores/atm.jpg'),
  comNieu: require('../assets/images/stores/com-nieu-sai-gon.jpg'),
  gogi: require('../assets/images/stores/gogi-house.jpg'),
  highlands: require('../assets/images/stores/highlands.jpg'),
  ivy: require('../assets/images/stores/ivy-moda-ha-noi.jpg'),
  laptop: require('../assets/images/stores/laptopjpg.jpg'),
  books: require('../assets/images/stores/nha-sachwebp.webp'),
  escalator: require('../assets/images/stores/thangmays.jpg'),
  tgdd: require('../assets/images/stores/thegioididong.jpg'),
  fashion: require('../assets/images/stores/thoi-trang.jpg'),
  trungNguyen: require('../assets/images/stores/trung-nguyen-legend.jpg'),
  wc: require('../assets/images/stores/wc.jpg'),
} satisfies Record<string, ImageSourcePropType>;
/* eslint-enable @typescript-eslint/no-require-imports */

/** Images for specific tenants (matched by name). */
const BY_NAME: Record<string, ImageSourcePropType> = {
  'Cơm niêu Sài Gòn': IMG.comNieu,
  'Gogi House': IMG.gogi,
  'Highlands Coffee': IMG.highlands,
  'IVY moda': IMG.ivy,
  'Thế Giới Di Động': IMG.tgdd,
  'Trung Nguyên Legend': IMG.trungNguyen,
  'Trung Nguyên E-Coffee': IMG.trungNguyen,
};

/** Fallback image per category. Categories without a photo fall back to the plain hero. */
const BY_CATEGORY: Partial<Record<StoreCategory, ImageSourcePropType>> = {
  atm: IMG.atm,
  books: IMG.books,
  coffee: IMG.highlands,
  electronics: IMG.laptop,
  elevator: IMG.escalator,
  escalator: IMG.escalator,
  fashion: IMG.fashion,
  food: IMG.comNieu,
  wc_female: IMG.wc,
  wc_male: IMG.wc,
};

export function getStoreImage(store: Pick<Store, 'name' | 'category'>): ImageSourcePropType | null {
  return BY_NAME[store.name] ?? BY_CATEGORY[store.category] ?? null;
}
