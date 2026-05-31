export class EMA {
  private _value: number | null = null;

  constructor(private alpha: number) {}

  update(sample: number): number {
    this._value = this._value === null
      ? sample
      : this.alpha * sample + (1 - this.alpha) * this._value;
    return this._value;
  }

  get value(): number | null { return this._value; }

  reset(): void { this._value = null; }
}
