/* Small ownership scope for featured exhibits. Dedicated landmark builders
   often finish textures/models asynchronously, so ownership must remain
   explicit and disposal must be safe to call more than once. */

export class ResourceScope {
  constructor(label = 'featured-exhibit'){
    this.label = label;
    this._disposed = false;
    this._cleanups = [];
    this._owned = new Set();
  }

  get disposed(){ return this._disposed; }

  /* Register any disposable value. Supplying a disposer is useful for values
     whose cleanup is not named dispose(). Each value is owned at most once. */
  own(value, disposer){
    if (value == null || this._owned.has(value)) return value;
    const cleanup = disposer || (typeof value.dispose === 'function'
      ? () => value.dispose()
      : null);
    if (!cleanup) throw new TypeError(this.label + ': owned value has no disposer');
    this._owned.add(value);
    this.defer(() => {
      this._owned.delete(value);
      cleanup(value);
    });
    return value;
  }

  /* Register an arbitrary cleanup. If async work resolves after disposal, its
     cleanup runs immediately rather than leaking until a later transition. */
  defer(cleanup){
    if (typeof cleanup !== 'function')
      throw new TypeError(this.label + ': cleanup must be a function');
    if (this._disposed) cleanup();
    else this._cleanups.push(cleanup);
    return cleanup;
  }

  /* Wrap async callbacks so disposed exhibits cannot mutate detached scenes. */
  guard(callback){
    if (typeof callback !== 'function')
      throw new TypeError(this.label + ': guarded callback must be a function');
    return (...args) => this._disposed ? undefined : callback(...args);
  }

  dispose(){
    if (this._disposed) return;
    this._disposed = true;
    const errors = [];
    for (let i = this._cleanups.length - 1; i >= 0; i--){
      try{ this._cleanups[i](); }
      catch (error){ errors.push(error); }
    }
    this._cleanups.length = 0;
    this._owned.clear();
    if (errors.length === 1) throw errors[0];
    if (errors.length > 1) throw new AggregateError(errors, this.label + ': disposal failed');
  }
}
