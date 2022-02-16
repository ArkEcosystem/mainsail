# Benchmarks

> Take those benchmark results with a grain of salt as the outcome will fluctuate, sometimes utils will be faster and sometimes lodash, with a marginal difference.

## Results

```
  Running 76 benchmarks, please wait...

  Utils.assign vs lodash.assign
    ✓  utils x 9,601,452 ops/sec ±3.02% (79 runs sampled)
    ✓  lodash x 742,912 ops/sec ±3.01% (84 runs sampled)

    Result: utils is 1192.41% faster than lodash.

  Utils.at vs lodash.at
    ✓  utils x 4,014,033 ops/sec ±2.25% (87 runs sampled)
    ✓  lodash x 1,482,101 ops/sec ±6.31% (78 runs sampled)

    Result: utils is 170.83% faster than lodash.

  Utils.camelCase vs lodash.camelCase
    ✓  utils x 730,291 ops/sec ±2.93% (81 runs sampled)
    ✓  lodash x 1,539,926 ops/sec ±5.38% (82 runs sampled)

    Result: utils is 52.58% slower than lodash.

  Utils.castArray vs lodash.castArray
    ✓  utils x 784,781,860 ops/sec ±1.61% (86 runs sampled)
    ✓  lodash x 755,607,794 ops/sec ±2.65% (88 runs sampled)

    Result: utils is 3.86% faster than lodash.

  Utils.chunk vs lodash.chunk
    ✓  utils x 26,195,232 ops/sec ±2.94% (89 runs sampled)
    ✓  lodash x 27,507,288 ops/sec ±0.91% (91 runs sampled)

    Result: utils is 4.77% slower than lodash.

  Utils.clone vs lodash.clone
    ✓  utils x 116,634,575 ops/sec ±2.92% (87 runs sampled)
    ✓  lodash x 31,536,524 ops/sec ±3.05% (87 runs sampled)

    Result: utils is 269.84% faster than lodash.

  Utils.cloneDeep vs lodash.cloneDeep
    ✓  utils x 2,206,898 ops/sec ±0.84% (89 runs sampled)
    ✓  lodash x 628,042 ops/sec ±0.90% (94 runs sampled)

    Result: utils is 251.39% faster than lodash.

  Utils.concat vs lodash.concat
    ✓  utils x 24,637,094 ops/sec ±5.39% (85 runs sampled)
    ✓  lodash x 2,490,825 ops/sec ±2.92% (83 runs sampled)

    Result: utils is 889.11% faster than lodash.

  Utils.fill vs lodash.fill
    ✓  utils x 77,027,665 ops/sec ±0.84% (91 runs sampled)
    ✓  lodash x 50,410,879 ops/sec ±0.87% (91 runs sampled)

    Result: utils is 52.80% faster than lodash.

  Utils.filterv vs Native.filter cs lodash.filter
    ✓  utils x 32,535,382 ops/sec ±7.87% (80 runs sampled)
    ✓  lodash x 15,585,004 ops/sec ±7.75% (74 runs sampled)

    Result: utils is 108.76% faster than lodash.

  Utils.findKey vs lodash.findKey
    ✓  utils x 4,802,904 ops/sec ±4.44% (77 runs sampled)
    ✓  lodash x 20,856,077 ops/sec ±4.40% (76 runs sampled)

    Result: utils is 76.97% slower than lodash.

  Utils.flatten vs lodash.flatten
    ✓  utils x 2,800,732 ops/sec ±1.93% (89 runs sampled)
    ✓  lodash x 3,136,714 ops/sec ±1.03% (90 runs sampled)

    Result: utils is 10.71% slower than lodash.

  Utils.get vs lodash.get
    ✓  utils x 10,330,610 ops/sec ±1.17% (94 runs sampled)
    ✓  lodash x 6,401,740 ops/sec ±1.50% (86 runs sampled)

    Result: utils is 61.37% faster than lodash.

  Utils.groupBy vs lodash.groupBy
    ✓  utils x 3,200,381 ops/sec ±0.98% (88 runs sampled)
    ✓  lodash x 3,193,109 ops/sec ±1.72% (86 runs sampled)

    Result: utils is 0.23% faster than lodash.

  Utils.has vs lodash.has
    ✓  utils x 12,121,346 ops/sec ±0.50% (92 runs sampled)
    ✓  lodash x 5,896,984 ops/sec ±0.94% (90 runs sampled)

    Result: utils is 105.55% faster than lodash.

  Utils.head vs lodash.head
    ✓  utils x 835,148,042 ops/sec ±0.67% (91 runs sampled)
    ✓  lodash x 779,036,391 ops/sec ±4.22% (87 runs sampled)

    Result: utils is 7.20% faster than lodash.

  Utils.indexOf vs lodash.indexOf
    ✓  utils x 169,695,500 ops/sec ±1.21% (88 runs sampled)
    ✓  lodash x 153,324,693 ops/sec ±3.08% (80 runs sampled)

    Result: utils is 10.68% faster than lodash.

  Utils.isArray vs lodash.isArray
    ✓  utils x 799,793,055 ops/sec ±1.15% (89 runs sampled)
    ✓  lodash x 776,479,763 ops/sec ±3.70% (87 runs sampled)

    Result: utils is 3.00% faster than lodash.

  Utils.isArray vs lodash.isArray
    ✓  utils x 781,896,243 ops/sec ±2.60% (82 runs sampled)
    ✓  lodash x 721,670,993 ops/sec ±5.09% (81 runs sampled)

    Result: utils is 8.35% faster than lodash.

  Utils.isBoolean vs lodash.isBoolean
    ✓  utils x 746,493,857 ops/sec ±3.17% (79 runs sampled)
    ✓  lodash x 838,518,878 ops/sec ±0.57% (94 runs sampled)

    Result: utils is 10.97% slower than lodash.

  Utils.isBoolean vs lodash.isBoolean
    ✓  utils x 809,813,184 ops/sec ±2.04% (91 runs sampled)
    ✓  lodash x 828,573,650 ops/sec ±0.59% (95 runs sampled)

    Result: utils is 2.26% slower than lodash.

  Utils.isEmpty vs lodash.isEmpty
    ✓  utils x 66,438,938 ops/sec ±0.89% (93 runs sampled)
    ✓  lodash x 172,183,294 ops/sec ±1.19% (90 runs sampled)

    Result: utils is 61.41% slower than lodash.

  Utils.isEqual vs lodash.isEqual
    ✓  utils x 2,348,274 ops/sec ±1.19% (89 runs sampled)
    ✓  lodash x 804,633,477 ops/sec ±1.10% (90 runs sampled)

    Result: utils is 99.71% slower than lodash.

  Utils.isFunction vs lodash.isFunction
    ✓  utils x 669,165,967 ops/sec ±5.18% (76 runs sampled)
    ✓  lodash x 739,350,262 ops/sec ±2.24% (86 runs sampled)

    Result: utils is 9.49% slower than lodash.

  Utils.isNil vs lodash.isNil
    ✓  utils x 543,913,662 ops/sec ±11.67% (63 runs sampled)
    ✓  lodash x 589,052,839 ops/sec ±6.24% (70 runs sampled)

    Result: utils is 7.66% slower than lodash.

  Utils.isNumber vs lodash.isNumber
    ✓  utils x 697,001,684 ops/sec ±4.96% (75 runs sampled)
    ✓  lodash x 745,266,950 ops/sec ±1.78% (84 runs sampled)

    Result: utils is 6.48% slower than lodash.

  Utils.isNumber vs lodash.isNumber
    ✓  utils x 783,871,115 ops/sec ±2.08% (88 runs sampled)
    ✓  lodash x 794,892,300 ops/sec ±1.83% (89 runs sampled)

    Result: utils is 1.39% slower than lodash.

  Utils.isObject vs lodash.isObject
    ✓  utils x 750,121,231 ops/sec ±3.06% (87 runs sampled)
    ✓  lodash x 706,086,864 ops/sec ±4.91% (80 runs sampled)

    Result: utils is 6.24% faster than lodash.

  Utils.isString vs lodash.isString
    ✓  utils x 812,839,776 ops/sec ±0.94% (91 runs sampled)
    ✓  lodash x 807,924,668 ops/sec ±0.84% (89 runs sampled)

    Result: utils is 0.61% faster than lodash.

  Utils.isString vs lodash.isString
    ✓  utils x 828,131,431 ops/sec ±0.38% (95 runs sampled)
    ✓  lodash x 820,024,176 ops/sec ±0.70% (90 runs sampled)

    Result: utils is 0.99% faster than lodash.

  Utils.isSymbol vs lodash.isSymbol
    ✓  utils x 821,833,258 ops/sec ±0.60% (93 runs sampled)
    ✓  lodash x 820,685,557 ops/sec ±0.62% (93 runs sampled)

    Result: utils is 0.14% faster than lodash.

  Utils.isUndefined vs lodash.isUndefined
    ✓  utils x 830,436,182 ops/sec ±0.34% (93 runs sampled)
    ✓  lodash x 834,799,176 ops/sec ±0.32% (95 runs sampled)

    Result: utils is 0.52% slower than lodash.

  Utils.keyBy vs lodash.keyBy
    ✓  utils x 14,577,374 ops/sec ±1.19% (88 runs sampled)
    ✓  lodash x 9,205,544 ops/sec ±0.82% (90 runs sampled)

    Result: utils is 58.35% faster than lodash.

  Utils.keys vs lodash.keys
    ✓  utils x 63,555,738 ops/sec ±1.16% (90 runs sampled)
    ✓  lodash x 23,089,182 ops/sec ±2.57% (83 runs sampled)

    Result: utils is 175.26% faster than lodash.

  Utils.keysIn vs lodash.keysIn
    ✓  utils x 247,270 ops/sec ±4.02% (78 runs sampled)
    ✓  lodash x 1,652,974 ops/sec ±8.64% (82 runs sampled)

    Result: utils is 85.04% slower than lodash.

  Utils.last vs lodash.last
    ✓  utils x 669,289,527 ops/sec ±6.55% (78 runs sampled)
    ✓  lodash x 690,409,613 ops/sec ±8.01% (78 runs sampled)

    Result: utils is 3.06% slower than lodash.

  Utils.lowerCase vs lodash.lowerCase
    ✓  utils x 657,031 ops/sec ±3.38% (78 runs sampled)
    ✓  lodash x 1,484,405 ops/sec ±5.19% (71 runs sampled)

    Result: utils is 55.74% slower than lodash.

  Utils.map vs Native.map vs lodash.map
    ✓  utils x 78,269,698 ops/sec ±2.80% (82 runs sampled)
    ✓  lodash x 28,990,609 ops/sec ±1.27% (87 runs sampled)

    Result: utils is 169.98% faster than lodash.

  Utils.mapValues vs lodash.mapValues
    ✓  utils x 8,755,630 ops/sec ±2.07% (85 runs sampled)
    ✓  lodash x 4,670,296 ops/sec ±0.97% (84 runs sampled)

    Result: utils is 87.47% faster than lodash.

  Utils.max vs lodash.max
    ✓  utils x 41,344,324 ops/sec ±1.89% (84 runs sampled)
    ✓  lodash x 111,970,176 ops/sec ±9.37% (82 runs sampled)

    Result: utils is 63.08% slower than lodash.

  Utils.maxBy vs lodash.maxBy
    ✓  utils x 7,698,227 ops/sec ±10.12% (54 runs sampled)
    ✓  lodash x 9,625,125 ops/sec ±6.14% (72 runs sampled)

    Result: utils is 20.02% slower than lodash.

  Utils.merge vs lodash.merge
    ✓  utils x 107,026 ops/sec ±7.17% (67 runs sampled)
    ✓  lodash x 364,185 ops/sec ±1.47% (87 runs sampled)

    Result: utils is 70.61% slower than lodash.

  Utils.min vs lodash.min
    ✓  utils x 39,096,950 ops/sec ±1.60% (90 runs sampled)
    ✓  lodash x 64,782,397 ops/sec ±6.38% (74 runs sampled)

    Result: utils is 39.65% slower than lodash.

  Utils.minBy vs lodash.minBy
    ✓  utils x 13,841,863 ops/sec ±3.02% (84 runs sampled)
    ✓  lodash x 11,907,561 ops/sec ±1.73% (85 runs sampled)

    Result: utils is 16.24% faster than lodash.

  Utils.orderBy vs lodash.orderBy
    ✓  utils x 932,444 ops/sec ±1.11% (89 runs sampled)
    ✓  lodash x 880,045 ops/sec ±1.05% (85 runs sampled)

    Result: utils is 5.95% faster than lodash.

  Utils.parse vs lodash.parse
    ✓  native x 3,283 ops/sec ±1.23% (91 runs sampled)
    ✓  utils x 3,244 ops/sec ±1.01% (93 runs sampled)

    Result: utils is 1.17% slower than native.

  Utils.partition vs lodash.partition
    ✓  utils x 11,117,653 ops/sec ±2.99% (87 runs sampled)
    ✓  lodash x 6,165,415 ops/sec ±1.93% (85 runs sampled)

    Result: utils is 80.32% faster than lodash.

  Utils.pick vs lodash.pick
    ✓  utils x 13,082,596 ops/sec ±1.09% (89 runs sampled)
    ✓  lodash x 1,186,499 ops/sec ±1.05% (86 runs sampled)

    Result: utils is 1002.62% faster than lodash.

  Utils.pickBy vs lodash.pickBy
    ✓  utils x 6,710,894 ops/sec ±7.86% (78 runs sampled)
    ✓  lodash x 1,053,121 ops/sec ±1.82% (91 runs sampled)

    Result: utils is 537.24% faster than lodash.

  Utils.pull vs lodash.pull
    ✓  utils x 11,620,578 ops/sec ±3.19% (89 runs sampled)
    ✓  lodash x 1,328,134 ops/sec ±2.06% (88 runs sampled)

    Result: utils is 774.95% faster than lodash.

  Utils.pullAll vs lodash.pullAll
    ✓  utils x 2,965,932 ops/sec ±6.64% (71 runs sampled)
    ✓  lodash x 2,815,429 ops/sec ±1.88% (84 runs sampled)

    Result: utils is 5.35% faster than lodash.

  Utils.pullAllBy vs lodash.pullAllBy
    ✓  utils x 1,538,971 ops/sec ±2.40% (80 runs sampled)
    ✓  lodash x 761,164 ops/sec ±1.53% (91 runs sampled)

    Result: utils is 102.19% faster than lodash.

  Utils.random vs lodash.random
    ✓  utils x 109,758,188 ops/sec ±1.46% (89 runs sampled)
    ✓  lodash x 73,437,372 ops/sec ±1.10% (91 runs sampled)

    Result: utils is 49.46% faster than lodash.

  Utils.reduce vs lodash.reduce
    ✓  utils x 132,341,246 ops/sec ±1.49% (88 runs sampled)
    ✓  lodash x 23,672,812 ops/sec ±1.20% (83 runs sampled)

    Result: utils is 459.04% faster than lodash.

  Utils.reject vs lodash.reject
    ✓  utils x 17,736,100 ops/sec ±1.27% (92 runs sampled)
    ✓  lodash x 6,256,549 ops/sec ±1.10% (85 runs sampled)

    Result: utils is 183.48% faster than lodash.

  Utils.sample vs lodash.sample
    ✓  utils x 93,286,914 ops/sec ±1.16% (89 runs sampled)
    ✓  lodash x 93,565,916 ops/sec ±1.01% (90 runs sampled)

    Result: utils is 0.3% slower than lodash.

  Utils.set vs lodash.set
    ✓  utils x 9,622,766 ops/sec ±0.92% (91 runs sampled)
    ✓  lodash x 3,492,122 ops/sec ±1.04% (90 runs sampled)

    Result: utils is 175.56% faster than lodash.

  Utils.shuffle vs lodash.shuffle
    ✓  utils x 15,594,068 ops/sec ±1.13% (87 runs sampled)
    ✓  lodash x 6,728,664 ops/sec ±1.45% (88 runs sampled)

    Result: utils is 131.76% faster than lodash.

  Utils.snakeCase vs lodash.snakeCase
    ✓  utils x 859,218 ops/sec ±1.42% (90 runs sampled)
    ✓  lodash x 2,210,595 ops/sec ±1.20% (85 runs sampled)

    Result: utils is 61.13% slower than lodash.

  Utils.some vs lodash.some
    ✓  utils x 136,921,487 ops/sec ±1.16% (90 runs sampled)
    ✓  lodash x 125,802,626 ops/sec ±1.14% (91 runs sampled)

    Result: utils is 8.84% faster than lodash.

  Utils.sortBy vs lodash.sortBy
    ✓  utils x 2,199,524 ops/sec ±0.97% (86 runs sampled)
    ✓  lodash x 711,739 ops/sec ±2.67% (86 runs sampled)

    Result: utils is 209.04% faster than lodash.

  Utils.sortByDesc vs lodash.sortByDesc
    ✓  utils x 2,071,649 ops/sec ±2.83% (82 runs sampled)
    ✓  lodash x 680,462 ops/sec ±3.97% (84 runs sampled)

    Result: utils is 204.45% faster than lodash.

  Utils.stringifyv vs Native.stringify
    ✓  native x 2,955,804 ops/sec ±2.14% (88 runs sampled)
    ✓  utils x 4,455,250 ops/sec ±3.97% (82 runs sampled)

    Result: utils is 50.73% faster than native.

  Utils.tail vs lodash.tail
    ✓  utils x 35,484,803 ops/sec ±4.43% (86 runs sampled)
    ✓  lodash x 64,720,390 ops/sec ±7.01% (73 runs sampled)

    Result: utils is 45.17% slower than lodash.

  Utils.take vs lodash.take
    ✓  utils x 35,279,137 ops/sec ±3.35% (80 runs sampled)
    ✓  lodash x 86,848,109 ops/sec ±1.87% (89 runs sampled)

    Result: utils is 59.38% slower than lodash.

  Utils.toLower vs lodash.toLower
    ✓  utils x 806,461,045 ops/sec ±2.11% (90 runs sampled)
    ✓  lodash x 766,569,875 ops/sec ±4.38% (84 runs sampled)

    Result: utils is 5.20% faster than lodash.

  Utils.toString vs lodash.toString
    ✓  utils x 1,387,777 ops/sec ±0.77% (94 runs sampled)
    ✓  lodash x 2,846,857 ops/sec ±0.96% (89 runs sampled)

    Result: utils is 51.25% slower than lodash.

  Utils.toUpper vs lodash.toUpper
    ✓  utils x 827,306,463 ops/sec ±0.50% (93 runs sampled)
    ✓  lodash x 815,032,506 ops/sec ±0.51% (91 runs sampled)

    Result: utils is 1.51% faster than lodash.

  Utils.union vs lodash.union
    ✓  utils x 6,777,646 ops/sec ±4.83% (89 runs sampled)
    ✓  lodash x 3,281,689 ops/sec ±3.96% (82 runs sampled)

    Result: utils is 106.53% faster than lodash.

  Utils.unionBy vs lodash.unionBy
    ✓  utils x 1,671,763 ops/sec ±2.00% (89 runs sampled)
    ✓  lodash x 1,293,479 ops/sec ±2.51% (87 runs sampled)

    Result: utils is 29.25% faster than lodash.

  Utils.uniq vs lodash.uniq
    ✓  utils x 11,109,759 ops/sec ±2.80% (83 runs sampled)
    ✓  lodash x 20,813,017 ops/sec ±2.83% (87 runs sampled)

    Result: utils is 46.62% slower than lodash.

  Utils.uniqBy vs lodash.uniqBy
    ✓  utils x 8,565,087 ops/sec ±1.74% (90 runs sampled)
    ✓  lodash x 3,004,591 ops/sec ±0.68% (90 runs sampled)

    Result: utils is 185.07% faster than lodash.

  Utils.unset vs lodash.unset
    ✓  utils x 6,811,374 ops/sec ±1.93% (87 runs sampled)
    ✓  lodash x 3,977,899 ops/sec ±1.95% (87 runs sampled)

    Result: utils is 71.23% faster than lodash.

  Utils.upperCase vs lodash.upperCase
    ✓  utils x 825,166 ops/sec ±2.05% (89 runs sampled)
    ✓  lodash x 1,729,727 ops/sec ±0.60% (89 runs sampled)

    Result: utils is 52.29% slower than lodash.

  Utils.upperFirst vs lodash.upperFirst
    ✓  utils x 44,566,950 ops/sec ±1.92% (90 runs sampled)
    ✓  lodash x 10,970,031 ops/sec ±2.37% (85 runs sampled)

    Result: utils is 306.26% faster than lodash.

  Utils.zipObject vs lodash.zipObject
    ✓  utils x 24,567,854 ops/sec ±0.91% (91 runs sampled)
    ✓  lodash x 11,842,021 ops/sec ±1.37% (88 runs sampled)

    Result: utils is 107.46% faster than lodash.


Finished in 916 seconds
```
