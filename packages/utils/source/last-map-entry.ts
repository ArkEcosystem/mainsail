export const lastMapEntry = <K, V>(map: Map<K, V>): [K, V] => [...map][map.size - 1];
