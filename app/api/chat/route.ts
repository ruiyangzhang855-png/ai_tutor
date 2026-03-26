import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://api.deepseek.com",
});

export async function POST(req: Request) {
  try {
    const { 
      messages, 
      currentNode, 
      subSectionIndex, 
      interactionPhase 
    } = await req.json();

    const currentSub = currentNode?.subSections?.[subSectionIndex] || { title: "未知内容", content: "" };

    const systemPrompt = `你是一只名为“金多利”的 “深度诊断型”CFA 导师猫。你语气活泼（喜欢用“喵”），但教学原则极其严苛。
      
      【当前教学上下文】
      - 章节：${currentNode?.label}
      - 小节标题：${currentSub.title}
      - 核心内容：${currentSub.content}
 
      【严禁行为】
      - 严禁因为学员说“好了”、“跳过”、“我知道了”、“下一页”而将 canNavigate 设为 true。
      - 严禁在完成 3 道题目挑战前结束 testing 阶段。
      
      【主动引导模式】
      - 无论学员第一句话说什么，你必须先执行【概述审核】：
        “喵！在开始这小节的挑战前，请先用你自己的话简单复述一下刚才看到的重点内容，或者跟我聊聊你的理解？”
      - 如果学员表现出抗拒，你可以提供 A/B/C 选项让他选，但绝不能直接跳过。

      【Testing 阶段 - 严禁单题反馈】
      1. 挑战开始：直接一次性给出 3 道选择题（易、中、难），编号为 1, 2, 3。
      2. 等待回答：在学员提交答案前，不要评价对错。
      3. 诊断报告：收到答案后，必须先在内部计算正确率。
        - 如果 100% 正确：放炮庆祝喵！设置 canNavigate = true。
        - 如果不满 100%：
          * 第一步：【通俗讲解】针对错题进行讲解。
          * 第二步：【漏洞诊断】分析学员是哪个考点理解有误（如：混淆了折现率和增长率）。
          * 第三步：【询问讲解】询问学员是否需要针对该漏洞进行专项深度讲解？
          * 第四步：【后续逻辑】
            - 若学员说“不需要”或“会了”：重新生成一组 3 道不同的题目，进入新一轮测试。
            - 若学员说“要讲解”：深入浅出地讲解，讲解完后再次询问是否准备好重测。
            - canNavigate 必须保持为 false。

      【排版要求】
      1. 严禁输出大段未分段的文字。
      2. 使用 **加粗** 强调核心金融术语。
      3. 使用 ### 标题 分隔诊断报告的不同部分。
      4. 使用 > 引用 块来展示题目。
      5. 使用 - 列表 来列出知识点。
      喵！让你的回答看起来像一份精美的笔记。

      【强制 JSON 格式】
      {
        "reply": "诊断报告或题目内容",
        "nextPhase": "testing",
        "canNavigate": false,
        "diagnose": "具体理解漏洞描述"
      }`;

    // 格式化消息，将 'bot' 映射为 'assistant'
    const formattedMessages = (messages || []).map((msg: any) => ({
      role: msg.role === 'bot' ? 'assistant' : msg.role,
      content: msg.content
    }));

    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        ...formattedMessages
      ],
      response_format: { type: "json_object" },
    });

  const rawContent = response.choices[0].message.content || "{}";

  try {
        const aiResult = JSON.parse(rawContent.trim());
        return NextResponse.json(aiResult);
      } catch (parseError) {
        return NextResponse.json({ 
          reply: "喵呜...解析失败，但我还在喵！", 
          nextPhase: interactionPhase, 
          canNavigate: false 
        });
      }

    } catch (error: any) {
      console.error("API Error:", error);
      return NextResponse.json({ 
        reply: "喵呜...系统开小差了喵。", 
        canNavigate: false,
        nextPhase: "error"
      }, { status: 500 });
    }
  }