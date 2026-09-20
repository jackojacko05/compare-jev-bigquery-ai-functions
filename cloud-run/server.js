import http from 'node:http';

const PORT = Number(process.env.PORT || 8080);
const GATEWAY_URL = 'https://ai-gateway.vercel.sh/typesafe/v1/systemone';
const CHAT_COMPLETIONS_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions';

const CATEGORY_CRITERIA = {
  Automotive: 'Vehicles, automotive replacement parts, tools, and accessories.',
  Baby: 'Products primarily intended for babies, infants, or their caregivers.',
  Books: 'Printed or electronic books and reading material.',
  CDs_and_Vinyl: 'Recorded music sold on CD, vinyl, or similar physical media.',
  Camera_and_Photo: 'Cameras, lenses, photography equipment, and camera accessories.',
  Cell_Phones_and_Accessories: 'Mobile phones, smartphone parts, cases, chargers, and accessories.',
  Clothing: 'Apparel and wearable garments, excluding shoes and jewelry.',
  Computers_and_Accessories: 'Computers, components, peripherals, storage, networking, and computer accessories.',
  Grocery_and_Gourmet_Food: 'Food, beverages, ingredients, and edible grocery products.',
  Health_and_Beauty: 'Personal care, cosmetics, grooming, wellness, and beauty products.',
  Home_and_Garden: 'Household, kitchen, furniture, decor, lawn, and garden products.',
  Jewelry: 'Rings, necklaces, bracelets, earrings, watches, and decorative personal accessories.',
  Luggage_and_Travel_Gear: 'Suitcases, travel bags, backpacks, and travel accessories.',
  Movies_and_TV: 'Movies and television programs on DVD, Blu-ray, or similar media.',
  Musical_Instruments: 'Musical instruments, recording equipment, and music-making accessories.',
  Office_Products: 'Office supplies, stationery, filing, presentation, and workplace products.',
  Other_Electronics: 'Consumer electronics that do not fit camera, phone, computer, or video game categories.',
  Pet_Supplies: 'Food, care products, toys, and accessories for pets.',
  Shoes: 'Footwear including shoes, boots, sandals, and slippers.',
  Sports_and_Outdoors: 'Sports, fitness, camping, recreation, and outdoor equipment.',
  Tools_and_Home_Improvement: 'Tools, hardware, building, repair, plumbing, electrical, and home-improvement products.',
  Toys_and_Games: 'Toys, board games, puzzles, and play products.',
  Video_Games: 'Video games, consoles, controllers, and dedicated gaming accessories.'
};

const STACK_OVERFLOW_TAG_CRITERIA = {
  javascript: 'JavaScript language and browser or server-side JavaScript code.',
  java: 'Java language, JVM applications, and Java libraries.',
  'c#': 'C# language and the C sharp ecosystem.',
  php: 'PHP language and PHP applications.',
  android: 'Android platform applications and Android APIs.',
  jquery: 'The jQuery JavaScript library.',
  python: 'Python language and Python libraries.',
  html: 'HTML markup and document structure.',
  'c++': 'C++ language and C++ libraries.',
  ios: 'Apple iOS platform applications and APIs.',
  css: 'CSS styling, layout, and presentation.',
  mysql: 'MySQL database specifically.',
  sql: 'General SQL language and relational database queries not specific to MySQL.',
  'asp.net': 'Microsoft ASP.NET web application framework.',
  'ruby-on-rails': 'Ruby on Rails web application framework.',
  'objective-c': 'Objective-C language.',
  c: 'C language, excluding C++ and Objective-C.',
  '.net': 'Microsoft .NET platform when the question is not specifically C# or ASP.NET.',
  angularjs: 'AngularJS version 1.x JavaScript framework.',
  iphone: 'Questions specifically about Apple iPhone hardware or iPhone-targeted behavior.'
};

const STACK_OVERFLOW_OFFICIAL_CRITERIA = {
  javascript: 'Programming in ECMAScript (JavaScript/JS), including browser and server implementations. JavaScript is not Java.',
  java: 'Problems using or understanding the Java programming language itself.',
  'c#': 'Code written in C# or the C# language specification; C# commonly targets the .NET family.',
  php: 'Programming in the PHP general-purpose scripting language.',
  android: 'Programming or development for Google Android devices and the Android framework.',
  jquery: 'Questions specifically using the jQuery library, including DOM traversal, events, animation, or AJAX.',
  python: 'Programming in the Python language or its implementations and libraries.',
  html: 'HTML markup and document structure for web pages, rather than their visual styling.',
  'c++': 'Code compiled with a C++ compiler; C++ is distinct from C.',
  ios: 'Programming on the iOS platform when the issue is not dependent on iPhone hardware or a specific language.',
  css: 'The look and formatting of HTML, XML, or SVG, including layout, colors, fonts, and animations.',
  mysql: 'Questions specific to the MySQL RDBMS or its SQL dialect; not other database systems.',
  sql: 'Standard or general SQL queries; if the issue uses DBMS-specific features, prefer that DBMS tag.',
  'asp.net': 'The Microsoft ASP.NET web application framework, excluding ASP.NET Core.',
  'ruby-on-rails': 'The Ruby on Rails full-stack web application framework.',
  'objective-c': 'Objective-C language features or code, rather than Apple platform or framework behavior.',
  c: 'The ISO C programming language; C is distinct from C++.',
  '.net': 'The Microsoft .NET Framework or runtime/platform itself, rather than C# syntax or ASP.NET web behavior.',
  angularjs: 'The AngularJS 1.x JavaScript framework, excluding Angular 2 and later.',
  iphone: 'Use only when the question depends specifically on Apple iPhone or iPod touch hardware; otherwise use ios.'
};

const STACK_OVERFLOW_FEWSHOT_CRITERIA = Object.fromEntries(
  Object.entries(STACK_OVERFLOW_TAG_CRITERIA).map(([label, description]) => [label, `${description} Example title: ${({
    javascript: 'window.onload vs body onload',
    java: 'Where can I find the Java JDK source code?',
    'c#': 'What does a question mark after a value type mean in C#?',
    php: 'Accurately measure execution time of PHP scripts',
    android: 'How to hide an Android button programmatically?',
    jquery: 'Remove inline styles with jQuery',
    python: 'Determine the number of days in a month in Python',
    html: 'Difference between the HTML section and div elements',
    'c++': 'Defining a global constant in C++',
    ios: 'An iOS 10 application lifecycle warning',
    css: 'Can a CSS class inherit other classes?',
    mysql: 'Perform mysqldump without a password prompt',
    sql: 'SQL sum with a condition',
    'asp.net': 'Microsoft.Web.Infrastructure assembly error in ASP.NET',
    'ruby-on-rails': 'Rails root directory path',
    'objective-c': 'Differences between strong and weak in Objective-C',
    c: 'Handling negative numbers in a C numeric algorithm',
    '.net': 'Math.Min and Math.Max equivalents for .NET dates',
    angularjs: 'Why is angular.min.js.map missing?',
    iphone: 'Detect whether an iPhone device is charging'
  })[label]}`])
);

const AMBIGUOUS_GROUPS = [
  ['ios', 'iphone', 'objective-c'],
  ['.net', 'c#', 'asp.net'],
  ['javascript', 'jquery', 'angularjs'],
  ['html', 'css'],
  ['sql', 'mysql'],
  ['c', 'c++', 'objective-c']
];

function jsonResponse(response, status, body) {
  const data = JSON.stringify(body);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(data)
  });
  response.end(data);
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 5_000_000) throw new Error('Request body is too large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function normalizeText(value, maxLength) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

async function callJev(state, questionName, instructions, criteria, logContext = {}) {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) throw new Error('AI_GATEWAY_API_KEY is not configured');

  const started = performance.now();
  const requestBody = JSON.stringify({
    model: 'typesafe-ai/jev',
    state,
    questions: {
      [questionName]: {
        type: 'choice',
        instructions,
        criteria
      }
    }
  });

  let payload;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const gatewayResponse = await fetch(GATEWAY_URL, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json'
        },
        body: requestBody,
        signal: AbortSignal.timeout(25_000)
      });
      payload = await gatewayResponse.json();
      if (gatewayResponse.ok) break;
      if (gatewayResponse.status < 500 && gatewayResponse.status !== 429) {
        throw new Error(`Vercel AI Gateway returned ${gatewayResponse.status}: ${payload.message || 'unknown error'}`);
      }
      throw new Error(`Retryable Vercel AI Gateway status ${gatewayResponse.status}`);
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  const answer = payload.answers?.[questionName];
  if (!answer?.choice) throw new Error(`Jev response did not contain a ${questionName} choice`);

  const result = {
    [questionName]: answer.choice,
    confidence: answer.confidence ?? null,
    probabilities: answer.probabilities ?? {},
    input_tokens: payload.usage?.input_tokens ?? null,
    output_tokens: payload.usage?.output_tokens ?? null,
    gateway_cost_usd: Number(payload.provider_metadata?.gateway?.cost ?? 0),
    generation_id: payload.provider_metadata?.gateway?.generationId ?? null,
    latency_ms: Math.round(performance.now() - started),
    model: payload.model ?? 'typesafe-ai/jev'
  };
  console.log(JSON.stringify({
    severity: 'INFO',
    message: 'Jev classification completed',
    task: logContext.task ?? 'unknown',
    run_id: logContext.runId ?? null,
    item_id: logContext.itemId ?? null,
    generation_id: result.generation_id,
    input_tokens: result.input_tokens,
    output_tokens: result.output_tokens,
    gateway_cost_usd: result.gateway_cost_usd,
    latency_ms: result.latency_ms
  }));
  return result;
}

async function callStrongReranker(title, body, firstLabel, runId, itemId, model = 'google/gemini-3.8-flash') {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) throw new Error('AI_GATEWAY_API_KEY is not configured');
  const group = AMBIGUOUS_GROUPS.find((labels) => labels.includes(firstLabel));
  if (!group) {
    return {
      label: firstLabel,
      input_tokens: 0,
      output_tokens: 0,
      gateway_cost_usd: 0,
      generation_id: null,
      latency_ms: 0,
      model,
      skipped: true
    };
  }

  const criteria = group.map((label) => `${label}: ${STACK_OVERFLOW_OFFICIAL_CRITERIA[label]}`).join('\n');
  const prompt = [
    'Re-evaluate this ambiguous Stack Overflow question.',
    `The first-stage classifier predicted: ${firstLabel}`,
    'Choose exactly one label from the candidates below. Return only the label, with no explanation.',
    '',
    criteria,
    '',
    `Title: ${normalizeText(title, 1_000)}`,
    `Question: ${normalizeText(body, 4_000)}`
  ].join('\n');
  const started = performance.now();
  let payload;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const gatewayResponse = await fetch(CHAT_COMPLETIONS_URL, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0,
          max_tokens: model === 'google/gemini-3.1-pro-preview' ? 4096 : 1024,
          reasoning: { effort: model === 'google/gemini-2.5-flash-lite' ? 'none' : 'low' },
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'stackoverflow_tag',
              schema: {
                type: 'object',
                properties: { label: { type: 'string', enum: group } },
                required: ['label'],
                additionalProperties: false
              }
            }
          }
        }),
        signal: AbortSignal.timeout(60_000)
      });
      payload = await gatewayResponse.json();
      if (gatewayResponse.ok) break;
      if (gatewayResponse.status < 500 && gatewayResponse.status !== 429) {
        throw new Error(`Vercel AI Gateway returned ${gatewayResponse.status}: ${payload.message || payload.error?.message || 'unknown error'}`);
      }
      throw new Error(`Retryable Vercel AI Gateway status ${gatewayResponse.status}`);
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  const raw = String(payload.choices?.[0]?.message?.content ?? '').trim();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }
  const label = group.find((candidate) => parsed?.label === candidate);
  if (!label) throw new Error(`Strong reranker returned an invalid label: ${raw.slice(0, 120)}`);
  const result = {
    label,
    input_tokens: payload.usage?.prompt_tokens ?? null,
    output_tokens: payload.usage?.completion_tokens ?? null,
    gateway_cost_usd: Number(payload.provider_metadata?.gateway?.cost ?? 0),
    generation_id: payload.provider_metadata?.gateway?.generationId ?? payload.id ?? null,
    latency_ms: Math.round(performance.now() - started),
    model: payload.model ?? model,
    skipped: false
  };
  console.log(JSON.stringify({
    severity: 'INFO',
    message: 'Strong rerank completed',
    task: 'stackoverflow_strong_rerank',
    run_id: normalizeText(runId, 120),
    item_id: normalizeText(itemId, 120),
    first_label: firstLabel,
    generation_id: result.generation_id,
    input_tokens: result.input_tokens,
    output_tokens: result.output_tokens,
    gateway_cost_usd: result.gateway_cost_usd,
    latency_ms: result.latency_ms
  }));
  return result;
}

async function callGeminiFull(title, body, runId, itemId, model = 'google/gemini-3.8-flash') {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) throw new Error('AI_GATEWAY_API_KEY is not configured');
  const labels = Object.keys(STACK_OVERFLOW_OFFICIAL_CRITERIA);
  const criteria = labels.map((label) => `${label}: ${STACK_OVERFLOW_OFFICIAL_CRITERIA[label]}`).join('\n');
  const prompt = [
    'Choose the single Stack Overflow tag that best matches the question.',
    'Choose exactly one label from the supplied candidates.',
    '',
    'Label criteria:',
    criteria,
    '',
    `Title: ${normalizeText(title, 1_000)}`,
    `Question: ${normalizeText(body, 4_000)}`
  ].join('\n');
  const started = performance.now();
  let payload;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const gatewayResponse = await fetch(CHAT_COMPLETIONS_URL, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0,
          max_tokens: model === 'google/gemini-3.1-pro-preview' ? 4096 : 1024,
          reasoning: { effort: model === 'google/gemini-2.5-flash-lite' ? 'none' : 'low' },
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'stackoverflow_tag',
              schema: {
                type: 'object',
                properties: { label: { type: 'string', enum: labels } },
                required: ['label'],
                additionalProperties: false
              }
            }
          }
        }),
        signal: AbortSignal.timeout(60_000)
      });
      payload = await gatewayResponse.json();
      if (gatewayResponse.ok) break;
      if (gatewayResponse.status < 500 && gatewayResponse.status !== 429) {
        throw new Error(`Vercel AI Gateway returned ${gatewayResponse.status}: ${payload.message || payload.error?.message || 'unknown error'}`);
      }
      throw new Error(`Retryable Vercel AI Gateway status ${gatewayResponse.status}`);
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  const raw = String(payload.choices?.[0]?.message?.content ?? '').trim();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }
  const label = labels.find((candidate) => parsed?.label === candidate);
  if (!label) throw new Error(`Gemini 3.8 Flash returned an invalid label: ${raw.slice(0, 120)}`);
  const result = {
    label,
    input_tokens: payload.usage?.prompt_tokens ?? null,
    output_tokens: payload.usage?.completion_tokens ?? null,
    gateway_cost_usd: Number(payload.provider_metadata?.gateway?.cost ?? 0),
    generation_id: payload.provider_metadata?.gateway?.generationId ?? payload.id ?? null,
    latency_ms: Math.round(performance.now() - started),
    model: payload.model ?? model
  };
  console.log(JSON.stringify({
    severity: 'INFO',
    message: 'Gemini full classification completed',
    task: 'stackoverflow_20class_gemini_full',
    run_id: normalizeText(runId, 120),
    item_id: normalizeText(itemId, 120),
    generation_id: result.generation_id,
    input_tokens: result.input_tokens,
    output_tokens: result.output_tokens,
    latency_ms: result.latency_ms
  }));
  return result;
}

async function classifyProduct(title, description) {
  return callJev(
    {
      title: normalizeText(title, 2_000),
      description: normalizeText(description, 8_000)
    },
    'category',
    'Choose the single product category that best matches the product title and description.',
    CATEGORY_CRITERIA,
    { task: 'wdc_product' }
  );
}

async function classifyStackOverflow(title, body, runId, itemId) {
  return callJev(
    {
      title: normalizeText(title, 1_000),
      question: normalizeText(body, 4_000)
    },
    'label',
    'Choose the single Stack Overflow tag that best matches the question. Choose only from the supplied labels.',
    STACK_OVERFLOW_TAG_CRITERIA,
    {
      task: 'stackoverflow_20class',
      runId: normalizeText(runId, 120),
      itemId: normalizeText(itemId, 120)
    }
  );
}

async function classifyStackOverflowVariant(title, body, runId, itemId, variant, firstLabel) {
  const cleanTitle = normalizeText(title, 1_000);
  const cleanBody = normalizeText(body, 4_000);
  let criteria = STACK_OVERFLOW_TAG_CRITERIA;
  let instructions = 'Choose the single Stack Overflow tag that best matches the question. Choose only from the supplied labels.';
  let state = { question: cleanBody };

  if (variant === 'official_criteria') {
    criteria = STACK_OVERFLOW_OFFICIAL_CRITERIA;
  } else if (variant === 'title_emphasis') {
    state = { title: cleanTitle, question: cleanBody };
    instructions += ' Treat the title as a strong signal of the primary topic.';
  } else if (variant === 'fewshot') {
    criteria = STACK_OVERFLOW_FEWSHOT_CRITERIA;
  } else if (variant === 'ambiguous_rerank') {
    const group = AMBIGUOUS_GROUPS.find((labels) => labels.includes(firstLabel));
    if (!group) {
      return {
        label: firstLabel,
        confidence: 1,
        input_tokens: 0,
        output_tokens: 0,
        gateway_cost_usd: 0,
        generation_id: null,
        latency_ms: 0,
        model: 'typesafe-ai/jev',
        skipped: true
      };
    }
    criteria = Object.fromEntries(group.map((label) => [label, STACK_OVERFLOW_OFFICIAL_CRITERIA[label]]));
    instructions = 'Re-evaluate this ambiguous Stack Overflow question and choose the most specific correct tag from the supplied labels.';
  } else {
    throw new Error(`Unknown Stack Overflow variant: ${variant}`);
  }

  return callJev(
    state,
    'label',
    instructions,
    criteria,
    {
      task: `stackoverflow_20class_${variant}`,
      runId: normalizeText(runId, 120),
      itemId: normalizeText(itemId, 120)
    }
  );
}

async function handle(request, response) {
  if (request.method === 'GET' && request.url === '/health') {
    return jsonResponse(response, 200, { status: 'ok' });
  }
  if (request.method !== 'POST') {
    return jsonResponse(response, 405, { errorMessage: 'POST required' });
  }

  try {
    const body = await readJson(request);
    if (!Array.isArray(body.calls)) throw new Error('BigQuery calls array is required');

    const isStackOverflow = request.url === '/stackoverflow';
    const isStackOverflowVariant = request.url === '/stackoverflow-variant';
    const isStrongRerank = request.url === '/stackoverflow-strong-rerank';
    const isGemini38Full = request.url === '/stackoverflow-gemini38-full';
    const isProRerank = request.url === '/stackoverflow-pro-rerank';
    const isProFull = request.url === '/stackoverflow-pro-full';
    const isGemini25FlashLiteFull = request.url === '/stackoverflow-gemini25fl-full';
    const replies = await Promise.all(
      body.calls.map(async (args) => {
        if (!Array.isArray(args)) throw new Error('Each call must be an argument array');
        try {
          if (isProFull) {
            return await callGeminiFull(args[0], args[1], args[2], args[3], 'google/gemini-3.1-pro-preview');
          }
          if (isGemini25FlashLiteFull) {
            return await callGeminiFull(args[0], args[1], args[2], args[3], 'google/gemini-2.5-flash-lite');
          }
          if (isGemini38Full) {
            return await callGeminiFull(args[0], args[1], args[2], args[3]);
          }
          if (isProRerank) {
            return await callStrongReranker(args[0], args[1], args[2], args[3], args[4], 'google/gemini-3.1-pro-preview');
          }
          if (isStrongRerank) {
            return await callStrongReranker(args[0], args[1], args[2], args[3], args[4]);
          }
          if (isStackOverflowVariant) {
            return await classifyStackOverflowVariant(args[0], args[1], args[2], args[3], args[4], args[5]);
          }
          return isStackOverflow
            ? await classifyStackOverflow(args[0], args[1], args[2], args[3])
            : await classifyProduct(args[0], args[1]);
        } catch (error) {
          console.error(JSON.stringify({ severity: 'ERROR', message: error.message }));
          return { error: String(error.message).slice(0, 900) };
        }
      })
    );
    return jsonResponse(response, 200, { replies });
  } catch (error) {
    console.error(JSON.stringify({ severity: 'ERROR', message: error.message }));
    return jsonResponse(response, 400, { errorMessage: String(error.message).slice(0, 900) });
  }
}

http.createServer(handle).listen(PORT, '0.0.0.0', () => {
  console.log(JSON.stringify({ severity: 'INFO', message: 'Jev remote function service started' }));
});
