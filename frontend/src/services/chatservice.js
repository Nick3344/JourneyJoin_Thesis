// src/services/chatService.js
import { ChatClient } from "@azure/communication-chat";
import { AzureCommunicationTokenCredential } from "@azure/communication-common";

export function createChatClient(acsEndpoint, acsToken) {
  const tokenCredential = new AzureCommunicationTokenCredential(acsToken);
  return new ChatClient(acsEndpoint, tokenCredential);
}
