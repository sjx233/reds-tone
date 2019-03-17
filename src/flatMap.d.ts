interface ReadonlyArray<T> {
  flatMap<U, This = undefined>(callback: (this: This, value: T, index: number, array: T[]) => U | U[], thisArg?: This): U[]
}

interface Array<T> {
  flatMap<U, This = undefined>(callback: (this: This, value: T, index: number, array: T[]) => U | U[], thisArg?: This): U[]
}
