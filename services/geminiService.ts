import { GoogleGenAI } from "@google/genai";
import { Card, Rank, Suit, PlayedHand, HandType } from "../types";

const formatCard = (c: Card) => {
    // Suit 0 = Clubs, 1 = Diamonds, 2 = Hearts, 3 = Spades
    const suits = ['梅花', '方塊', '紅心', '黑桃'];
    const ranks = ['3','4','5','6','7','8','9','10','J','Q','K','A','2'];
    return `${suits[c.suit]} ${ranks[c.rank]}`;
};

export const getGeminiAdvice = async (
    playerHand: Card[],
    lastHand: PlayedHand | null,
    history: string[]
): Promise<string> => {
    
    if (!process.env.API_KEY) {
        return "我需要 API Key 才能看牌！";
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const handDescription = playerHand.map(formatCard).join(', ');
    const tableState = lastHand 
        ? `目前桌上的牌型是 ${lastHand.type}，牌面: ${lastHand.cards.map(formatCard).join(', ')}。` 
        : "現在桌上是空的，由你自由出牌。";

    const prompt = `
    你是一位精通台灣大老二 (Big Two) 的撲克牌教練。
    
    遊戲情境:
    - 我的手牌: [${handDescription}]
    - 桌面狀況: ${tableState}
    - 最近出牌紀錄: ${history.slice(-3).join('; ')}

    規則簡述: 
    - 方塊3 先出。
    - 2 是最大的牌。 
    - 花色大小: 黑桃 > 紅心 > 方塊 > 梅花。
    - 必須打出比上家大的牌，且張數相同 (除了鐵支和同花順可以壓制)。

    任務:
    請給我簡短、機智且具策略性的出牌建議 (繁體中文)。
    如果贏面不大，請建議我保留實力。
    請用稍微帶點競爭心態或幽默的語氣，長度保持在兩句話以內。
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        return response.text || "出你最大那張吧！";
    } catch (error) {
        console.error("Gemini Error:", error);
        return "我的線路好像秀逗了，這把靠你的直覺吧！";
    }
};