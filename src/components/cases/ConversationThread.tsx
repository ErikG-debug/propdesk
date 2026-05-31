"use client";

interface Message {
  id: string;
  fromResident: boolean;
  body: string;
  sentAt: string;
}

export function ConversationThread({ messages }: { messages: Message[] }) {
  return (
    <div className="flex flex-col gap-3">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.fromResident ? "justify-start" : "justify-end"}`}
        >
          <div
            className={`max-w-[80%] rounded-lg px-4 py-3 text-sm ${
              msg.fromResident
                ? "bg-gray-100 text-gray-800"
                : "bg-blue-600 text-white"
            }`}
          >
            <p className="whitespace-pre-wrap">{msg.body}</p>
            <p
              className={`mt-1.5 text-right text-xs ${
                msg.fromResident ? "text-gray-400" : "text-blue-200"
              }`}
            >
              {msg.fromResident ? "Hyresgäst" : "AI / Handläggare"} ·{" "}
              {new Date(msg.sentAt).toLocaleString("sv-SE", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
