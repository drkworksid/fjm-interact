export function broadcastToEvent(eventCode: string, eventName: string, data: any) {
  if (typeof global !== "undefined" && (global as any).io) {
    const io = (global as any).io;
    const room = `event:${eventCode.toUpperCase()}`;
    io.to(room).emit(eventName, data);
  }
}

