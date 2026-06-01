import { EventBus } from '../bus/event-bus';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  it('should emit events to subscribed listeners', () => {
    const listener = jest.fn();
    bus.on('test', listener);
    bus.emit('test', { value: 42 });
    expect(listener).toHaveBeenCalledWith({ value: 42 });
  });

  it('should support multiple listeners on same event', () => {
    const l1 = jest.fn();
    const l2 = jest.fn();
    bus.on('test', l1);
    bus.on('test', l2);
    bus.emit('test', 'hello');
    expect(l1).toHaveBeenCalledWith('hello');
    expect(l2).toHaveBeenCalledWith('hello');
  });

  it('should unsubscribe when calling returned function', () => {
    const listener = jest.fn();
    const unsub = bus.on('test', listener);
    unsub();
    bus.emit('test', 'data');
    expect(listener).not.toHaveBeenCalled();
  });

  it('should remove specific listener with off()', () => {
    const listener = jest.fn();
    bus.on('test', listener);
    bus.off('test', listener);
    bus.emit('test', 'data');
    expect(listener).not.toHaveBeenCalled();
  });

  it('should clear all listeners for a specific event', () => {
    const l1 = jest.fn();
    const l2 = jest.fn();
    bus.on('test', l1);
    bus.on('test', l2);
    bus.on('other', l1);
    bus.removeAllListeners('test');
    bus.emit('test', 'data');
    expect(l1).not.toHaveBeenCalled();
    expect(l2).not.toHaveBeenCalled();
  });

  it('should clear ALL listeners when no event specified', () => {
    const l1 = jest.fn();
    const l2 = jest.fn();
    bus.on('a', l1);
    bus.on('b', l2);
    bus.removeAllListeners();
    bus.emit('a', 1);
    bus.emit('b', 2);
    expect(l1).not.toHaveBeenCalled();
    expect(l2).not.toHaveBeenCalled();
  });

  it('should not crash when emitting to event with no listeners', () => {
    expect(() => bus.emit('nonexistent', 'data')).not.toThrow();
  });

  it('should not let one failing listener break others', () => {
    const goodListener = jest.fn();
    const badListener = jest.fn(() => { throw new Error('boom'); });
    bus.on('test', badListener);
    bus.on('test', goodListener);
    bus.emit('test', 'data');
    expect(badListener).toHaveBeenCalled();
    expect(goodListener).toHaveBeenCalled();
  });
});
