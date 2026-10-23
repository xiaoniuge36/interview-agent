---
title: "第21章：给 Agent 加上语音交互：ASR + 流式 TTS"
date: 2026-10-22
tags: [外部资料, 语音交互, ASR, TTS]
kind: reference
track: 外部资料
source: ai-god-learn/学习笔记/21-Agent语音交互-ASR-TTS/README.md
---

# 第21章：给 Agent 加上语音交互：ASR + 流式 TTS

## 本章目标

- 让 Agent 支持“语音输入、文字输出、语音播报”
- 搭出 `ASR -> AI SSE -> TTS WebSocket -> 前端播放` 的完整链路
- 理清为什么文本适合 SSE，音频适合 WebSocket

---

## 1. 语音交互的完整链路

对应学习代码：

- `ai-agent-course-code-learn/asr-and-tts-nest-service/src/ai/`
- `ai-agent-course-code-learn/asr-and-tts-nest-service/src/speech/`
- `ai-agent-course-code-learn/asr-and-tts-nest-service/src/common/stream-events.ts`
- `ai-agent-course-code-learn/asr-and-tts-nest-service/public/asr-ai-stream.html`

### 整体流程

```text
前端录音
  -> /speech/asr 上传音频
  -> ASR 转文字
  -> /ai/chat/stream 用 SSE 流式返回文本
  -> EventEmitter 把文本片段广播给 TTS Relay
  -> TTS Relay 通过 WebSocket 对接腾讯云流式 TTS
  -> 再把音频二进制推给前端播放
```

这条链里，语音输入和语音输出是两条不同能力，但都围绕中间的“流式文本”展开。

---

## 2. ASR：语音输入为什么通常不是流式

对应学习代码：

- `ai-agent-course-code-learn/asr-and-tts-nest-service/src/speech/speech.service.ts`
- `ai-agent-course-code-learn/asr-and-tts-nest-service/src/speech/speech.controller.ts`
- `ai-agent-course-code-learn/asr-and-tts-nest-service/public/asr.html`

### 本章的实现方式

1. 前端用 `MediaRecorder` 录音
2. 停止录音后把 `Blob` 作为 `FormData` 上传
3. 服务端把音频 `buffer` 转成 Base64
4. 调用腾讯云 `SentenceRecognition` 返回识别文本

### 为什么这里不强求流式 ASR

因为很多日常对话场景里：

- 用户先说完一句
- 系统再统一识别成文本
- 再拿文本去问大模型

这个链路实现更简单，也更适合先打通“语音输入 Agent”。

---

## 3. 文字输出为什么继续走 SSE

对应学习代码：

- `ai-agent-course-code-learn/asr-and-tts-nest-service/src/ai/ai.service.ts`
- `ai-agent-course-code-learn/asr-and-tts-nest-service/src/ai/ai.controller.ts`

文字回答这层，本质上还是上一章的流式 AI 对话：

- `AiService` 里用 LangChain `stream()`
- `AiController` 用 `@Sse()` 把 chunk 逐段推给前端

### SSE 在这里的优势

- 浏览器对文本流支持简单
- 前端不需要手动维护复杂协议
- 很适合打字机效果的连续文本展示

所以整条语音链路里，文本层继续复用 SSE 是非常合理的。

---

## 4. 为什么音频不能继续用 SSE

### 根本原因

SSE 是基于 HTTP 的文本协议，天然适合字符串，不适合高频二进制音频流。

如果硬要走 SSE，就必须：

- 把音频转成 Base64
- 体积膨胀
- 前后端都要增加额外编码/解码成本

### 所以本章的设计是

- 文本：SSE
- 音频：WebSocket

也就是一条文本通道 + 一条二进制通道。

---

## 5. `EventEmitter + TtsRelayService` 是这一章的关键桥梁

对应学习代码：

- `ai-agent-course-code-learn/asr-and-tts-nest-service/src/speech/tts-relay.service.ts`
- `ai-agent-course-code-learn/asr-and-tts-nest-service/src/common/stream-events.ts`
- `ai-agent-course-code-learn/asr-and-tts-nest-service/src/main.ts`

### 它解决了什么问题

`AiService` 负责生成文本，`TtsRelayService` 负责把文本送到流式 TTS 服务。

二者之间不应该直接强耦合，所以用事件做解耦：

- `start`：开始一次语音播报会话
- `chunk`：有新的文本片段
- `end`：文本输出结束
- `error`：中途失败

这样，AI 生成和 TTS 转发就变成了两个独立模块，只通过事件协作。

---

## 6. 前端播放流式音频的关键：`Audio + MediaSource + SourceBuffer`

对应学习代码：

- `ai-agent-course-code-learn/asr-and-tts-nest-service/public/asr-ai-stream.html`

### 这套组合在做什么

1. 用 `Audio` 标签承载播放器
2. 用 `MediaSource` 创建一个可持续喂数据的媒体源
3. 用 `SourceBuffer.appendBuffer()` 持续推入 WebSocket 收到的音频二进制

于是前端就不必等待整段音频生成完成，而是可以边收边播。

### 这也是“流式 TTS”的用户体验关键

如果等 AI 全部回答完再一次性合成语音，体验就会退化成：

- 先等文本生成
- 再等语音生成
- 最后才开始播放

这和真正的语音助手体验差很多。

---

## 7. 这一章最重要的工程拆分

### 后端职责

- `SpeechService`：音频识别
- `AiService`：生成流式文本
- `TtsRelayService`：把文本转成流式音频
- `main.ts`：提供浏览器可连接的 WebSocket 服务

### 前端职责

- `MediaRecorder`：录音
- `fetch(FormData)`：上传音频做 ASR
- `EventSource`：接收 AI 文本流
- `WebSocket + MediaSource`：接收并播放 TTS 音频流

---

## 8. 本章关键收获

### 架构层面

- 语音 Agent 不是单接口完成，而是“识别、生成、播报”三段式链路
- 文本层和音频层应该分通道处理
- 事件总线非常适合做 AI 文本流和 TTS 服务之间的解耦

### 工程层面

- ASR 更适合上传整段音频再识别
- TTS 更适合边收到文本边生成语音
- `MediaSource` 是浏览器端流式播放音频的关键能力

### 对应代码入口

- `ai-agent-course-code-learn/asr-and-tts-nest-service/`

### Demo 页面

启动后端后访问：

```bash
cd ai-agent-course-code-learn/asr-and-tts-nest-service
npm run start:dev
# → http://localhost:3000/asr.html            (ASR 录音上传测试)
# → http://localhost:3000/asr-ai-stream.html   (完整语音助手：录音 + AI 流式回复 + TTS 播报)
```

