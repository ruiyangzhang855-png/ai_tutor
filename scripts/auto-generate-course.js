require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const pdf = require('pdf-extraction');
const { OpenAI } = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://api.deepseek.com",
});

const INPUT_PDF = './public/pdfs/cfa-notes.pdf'; 
const OUTPUT_JSON = './data/course.json';

async function main() {
  console.log('🚀 开始全自动“关卡式”课程生成...');

  try {
    // 1. 读取 PDF
    const dataBuffer = fs.readFileSync(INPUT_PDF);
    const pdfData = await pdf(dataBuffer);
    const fullText = pdfData.text.replace(/\s+/g, ' ').trim();
    console.log(`✅ PDF 读取成功 (${fullText.length} 字)`);

    // 2. 步骤一：规划大纲 (Nodes)
    console.log('🤖 正在规划大章结构...');
    const outlineRes = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "你是一名 CFA 教研专家。请阅读教材大纲，将其拆解为 3-4 个大章节 (Nodes)。只需输出 JSON: { \"nodes\": [{ \"id\": \"...\", \"label\": \"...\" }] }"
        },
        { role: "user", content: fullText.substring(0, 5000) }
      ],
      response_format: { type: "json_object" }
    });

    const nodesSkeleton = JSON.parse(outlineRes.choices[0].message.content).nodes;

    // 3. 步骤二：为每个大章拆分“闯关小节” (subSections)
    const finalNodes = [];
    const chunkSize = Math.floor(fullText.length / nodesSkeleton.length);

    for (let i = 0; i < nodesSkeleton.length; i++) {
      const node = nodesSkeleton[i];
      console.log(`\n📦 正在拆解大章: ${node.label}...`);

      const sectionText = fullText.substring(i * chunkSize, (i + 1) * chunkSize);

      const subSectionRes = await client.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `你是一名 CFA 教研专家。请将当前章节内容拆解为 2-3 个逻辑独立的“闯关小节” (subSections)。
            每个小节需要：
            1. title: 小节标题。
            2. content: 详细的教学文本 (用于页面显示)。
            3. videoUrl: (暂填空字符串，预留位置)。
            同时为整个大章提取 3 个核心 Keywords。
            输出 JSON 格式: { \"subSections\": [...], \"keywords\": [...] }`
          },
          { role: "user", content: sectionText.substring(0, 10000) }
        ],
        response_format: { type: "json_object" }
      });

      const detail = JSON.parse(subSectionRes.choices[0].message.content);
      
      finalNodes.push({
        ...node,
        keywords: detail.keywords,
        subSections: detail.subSections,
        knowledge: detail.subSections[0]?.content || "" // 兜底用
      });
      console.log(`   ✅ 已生成 ${detail.subSections.length} 个闯关小节。`);
    }

    // 4. 写入文件
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify({ nodes: finalNodes }, null, 2));
    console.log('\n✨ 课程 JSON 已重构！现在支持“子章节”和“闯关模式”了。');

  } catch (error) {
    console.error('❌ 脚本崩溃:', error.message);
  }
}

main();