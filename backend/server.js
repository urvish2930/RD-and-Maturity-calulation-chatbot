const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const OpenAI = require("openai");

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Enhanced RD calculation functions with improved accuracy
function calculateForwardRD(P, n, r) {
  const principal = P * n;
  const interest = (P * n * (n + 1) * r) / (2 * 12 * 100);
  const maturity = principal + interest;
  return {
    principal: Math.round(principal * 100) / 100,
    interest: Math.round(interest * 100) / 100,
    maturity: Math.round(maturity * 100) / 100,
    n, P, r
  };
}

function calculateReverseRate(P, n, A) {
  const principal = P * n;
  const interest = A - principal;
  const r = (interest * 2 * 12 * 100) / (P * n * (n + 1));
  return {
    principal: Math.round(principal * 100) / 100,
    interest: Math.round(interest * 100) / 100,
    r: Math.round(r * 100) / 100,
    maturity: A, n, P
  };
}

function calculateMonthlyInstalment(A, n, r) {
  const coefficient = n * (1 + (n + 1) * r / (2 * 12 * 100));
  const P = A / coefficient;
  const principal = P * n;
  const interest = A - principal;
  return {
    P: Math.round(P * 100) / 100,
    principal: Math.round(principal * 100) / 100,
    interest: Math.round(interest * 100) / 100,
    maturity: A, n, r
  };
}

function calculateTimeFromMaturity(P, A, r) {
  // Quadratic equation: (P*r/(2*12*100))n² + P(1 + r/(2*12*100))n - A = 0
  const a = (P * r) / (2 * 12 * 100);
  const b = P * (1 + r / (2 * 12 * 100));
  const c = -A;
  
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) {
    throw new Error("No real solution exists for the given values");
  }
  
  const n1 = (-b + Math.sqrt(discriminant)) / (2 * a);
  const n2 = (-b - Math.sqrt(discriminant)) / (2 * a);
  
  const n = Math.max(n1, n2);
  const nRounded = Math.round(n);
  
  return {
    n: nRounded,
    years: Math.round((nRounded / 12) * 100) / 100,
    principal: Math.round((P * nRounded) * 100) / 100,
    interest: Math.round((A - P * nRounded) * 100) / 100,
    maturity: A, P, r
  };
}

function calculateInterestOnly(P, n, r) {
  const interest = (P * n * (n + 1) * r) / (2 * 12 * 100);
  return {
    interest: Math.round(interest * 100) / 100,
    principal: Math.round((P * n) * 100) / 100,
    maturity: Math.round((P * n + interest) * 100) / 100,
    P, n, r
  };
}

function compareRDAccounts(accounts) {
  const results = accounts.map(acc => calculateForwardRD(acc.P, acc.n, acc.r));
  return results.map((result, index) => ({
    ...result,
    account: index + 1,
    name: accounts[index].name || `Account ${index + 1}`
  }));
}

function parseTimeToMonths(timeStr) {
  if (!timeStr) return null;
  
  const cleanTime = timeStr.toLowerCase().replace(/[^\d\.\s½\/yearsmonths]/g, '');
  
  // Handle various time formats
  let months = 0;
  
  // Years and months combination (e.g., "1 year 3 months", "4½ years")
  const yearMonthMatch = timeStr.match(/(\d+(?:\.\d+)?|\d+½)\s*year[s]?\s*(?:and\s*)?(\d+)\s*month[s]?/i);
  if (yearMonthMatch) {
    let years = yearMonthMatch[1];
    if (years.includes('½')) years = parseFloat(years.replace('½', '.5'));
    else years = parseFloat(years);
    
    const monthsPart = parseInt(yearMonthMatch[2]);
    return Math.round(years * 12 + monthsPart);
  }
  
  // Only years (e.g., "2 years", "3½ years", "4.5 years")
  const yearMatch = timeStr.match(/(\d+(?:\.\d+)?|\d+½)\s*year[s]?/i);
  if (yearMatch) {
    let years = yearMatch[1];
    if (years.includes('½')) years = parseFloat(years.replace('½', '.5'));
    else years = parseFloat(years);
    return Math.round(years * 12);
  }
  
  // Only months (e.g., "36 months", "18 months")
  const monthMatch = timeStr.match(/(\d+)\s*month[s]?/i);
  if (monthMatch) {
    return parseInt(monthMatch[1]);
  }
  
  // Fraction format (e.g., "2½", "4.5")
  const fractionMatch = timeStr.match(/(\d+)½/);
  if (fractionMatch) {
    return Math.round((parseInt(fractionMatch[1]) + 0.5) * 12);
  }
  
  return null;
}

function extractRDValues(text) {
  const cleanText = text.replace(/,/g, '');
  
  // Enhanced rupee amount extraction with better patterns
  const rupeePatterns = [
    /₹\s*(\d+(?:\.\d+)?)/g,
    /rs\.?\s*(\d+(?:\.\d+)?)/gi,
    /rupees?\s*(\d+(?:\.\d+)?)/gi,
    /\b(\d+(?:\.\d+)?)\s*rupees?\b/gi
  ];
  
  let rupeeAmounts = [];
  rupeePatterns.forEach(pattern => {
    const matches = Array.from(cleanText.matchAll(pattern));
    rupeeAmounts.push(...matches.map(m => parseFloat(m[1])));
  });
  
  // Remove duplicates and sort
  rupeeAmounts = [...new Set(rupeeAmounts)].sort((a, b) => a - b);
  
  // Extract interest rate with better patterns
  const ratePatterns = [
    /(\d+(?:\.\d+)?)\s*%\s*per\s*annum/i,
    /(\d+(?:\.\d+)?)\s*%\s*p\.?a\.?/i,
    /(\d+(?:\.\d+)?)\s*%/,
    /rate\s*of\s*(\d+(?:\.\d+)?)/i,
    /interest\s*(?:rate\s*)?(?:is\s*)?(\d+(?:\.\d+)?)\s*%/i
  ];
  
  let r = null;
  for (const pattern of ratePatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      r = parseFloat(match[1]);
      break;
    }
  }
  
  // Extract time period with enhanced parsing
  const timePatterns = [
    /(\d+(?:\.\d+)?|\d+½)\s*year[s]?\s*(?:and\s*)?(\d+)\s*month[s]?/i,
    /(\d+(?:\.\d+)?|\d+½)\s*year[s]?/i,
    /(\d+)\s*month[s]?/i,
    /for\s*(\d+(?:\.\d+)?|\d+½)\s*year[s]?/i,
    /period\s*of\s*(\d+(?:\.\d+)?|\d+½)\s*year[s]?/i
  ];
  
  let n = null;
  for (const pattern of timePatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      n = parseTimeToMonths(match[0]);
      break;
    }
  }
  
  // Enhanced identification of amounts
  const lowerText = text.toLowerCase();
  let P = null, A = null;
  
  // Keywords for identification
  const monthlyKeywords = ['per month', 'monthly', 'every month', 'each month', 'instalment', 'monthly instalment', 'deposits', 'deposited'];
  const maturityKeywords = ['maturity', 'gets', 'receives', 'payable', 'amount', 'total', 'at the end', 'on maturity', 'maturity value'];
  const interestKeywords = ['interest', 'interest earned', 'interest paid'];
  
  // Identify amounts based on context
  for (let i = 0; i < rupeeAmounts.length; i++) {
    const amount = rupeeAmounts[i];
    const amountStr = amount.toString();
    const amountIndex = text.indexOf(amountStr);
    
    if (amountIndex === -1) continue;
    
    const beforeAmount = text.substring(Math.max(0, amountIndex - 100), amountIndex).toLowerCase();
    const afterAmount = text.substring(amountIndex, amountIndex + 100).toLowerCase();
    const context = beforeAmount + afterAmount;
    
    // Check for monthly deposit
    if (monthlyKeywords.some(keyword => context.includes(keyword))) {
      P = amount;
    }
    // Check for maturity amount
    else if (maturityKeywords.some(keyword => context.includes(keyword))) {
      A = amount;
    }
    // Check for interest only
    else if (interestKeywords.some(keyword => context.includes(keyword))) {
      // Handle interest-only questions
      continue;
    }
  }
  
  // Fallback logic if context-based identification fails
  if (rupeeAmounts.length === 2 && (!P || !A)) {
    if (!P && !A) {
      // Assume smaller amount is monthly, larger is maturity
      P = Math.min(...rupeeAmounts);
      A = Math.max(...rupeeAmounts);
    } else if (!P) {
      P = rupeeAmounts.find(amt => amt !== A);
    } else if (!A) {
      A = rupeeAmounts.find(amt => amt !== P);
    }
  }
  
  return { P, A, r, n, allAmounts: rupeeAmounts };
}

function identifyProblemType(P, A, r, n, text) {
  const lowerText = text.toLowerCase();
  
  // Enhanced keyword detection for problem types
  const findKeywords = ['find', 'calculate', 'determine', 'what is', 'what will be', 'compute'];
  const maturityKeywords = ['maturity', 'amount payable', 'total amount', 'gets', 'receives', 'maturity value'];
  const rateKeywords = ['rate', 'interest rate', 'rate of interest', 'find the rate'];
  const monthlyKeywords = ['monthly instalment', 'monthly deposit', 'amount every month', 'sum of money', 'monthly payment'];
  const timeKeywords = ['time', 'period', 'how long', 'years', 'months', 'duration'];
  const interestKeywords = ['interest', 'interest earned', 'interest paid'];
  const compareKeywords = ['compare', 'who gets more', 'difference', 'which is better'];
  
  // Check for comparison problems
  if (compareKeywords.some(keyword => lowerText.includes(keyword))) {
    return 'comparison';
  }
  
  // Check for interest-only calculations
  if (interestKeywords.some(keyword => lowerText.includes(keyword)) && 
      findKeywords.some(keyword => lowerText.includes(keyword))) {
    if (P && n && r && !A) return 'interest_only';
  }
  
  // Standard problem type identification
  if (P && n && r && !A) {
    if (maturityKeywords.some(keyword => lowerText.includes(keyword))) {
      return 'forward';
    }
    return 'forward'; // Default for complete P, n, r set
  }
  
  if (P && n && A && !r) return 'reverse_rate';
  if (A && n && r && !P) return 'monthly_instalment';
  if (P && A && r && !n) return 'time_calculation';
  
  // Context-based identification for edge cases
  if (findKeywords.some(keyword => lowerText.includes(keyword))) {
    if (maturityKeywords.some(keyword => lowerText.includes(keyword)) && P && n && r) {
      return 'forward';
    }
    if (rateKeywords.some(keyword => lowerText.includes(keyword)) && P && n && A) {
      return 'reverse_rate';
    }
    if (monthlyKeywords.some(keyword => lowerText.includes(keyword)) && A && n && r) {
      return 'monthly_instalment';
    }
    if (timeKeywords.some(keyword => lowerText.includes(keyword)) && P && A && r) {
      return 'time_calculation';
    }
  }
  
  return 'unknown';
}

function generateSolutionPrompt(problemType, calculationResult, originalMessage, values) {
  const { P, A, r, n } = values;
  
  const basePrompt = `You are an expert ICSE Class 10 Banking and RD tutor. Solve this step-by-step using the standard RD formula and show all mathematical working clearly.

RD Formula: A = P × n + (P × n × (n+1) × r) / (2 × 12 × 100)
Where: A = Maturity Amount, P = Monthly Deposit, n = Time in months, r = Annual rate %

Student's Question: "${originalMessage}"

`;

  switch (problemType) {
    case 'forward':
      return basePrompt + `This is a MATURITY VALUE calculation problem.

Given Values:
- Monthly Deposit (P) = ₹${P}
- Time Period (n) = ${n} months = ${(n/12).toFixed(1)} years
- Rate of Interest (r) = ${r}% per annum

SOLUTION:
Using the RD formula: A = P × n + (P × n × (n+1) × r) / (2 × 12 × 100)

Step 1: Calculate Total Principal
Principal = P × n = ₹${P} × ${n} = ₹${calculationResult.principal}

Step 2: Calculate Interest
Interest = (P × n × (n+1) × r) / (2 × 12 × 100)
Interest = (₹${P} × ${n} × ${n+1} × ${r}) / (2 × 12 × 100)
Interest = (₹${P} × ${n} × ${n+1} × ${r}) / 2400
Interest = ₹${calculationResult.interest}

Step 3: Calculate Maturity Value
Maturity Value = Principal + Interest
Maturity Value = ₹${calculationResult.principal} + ₹${calculationResult.interest}
Maturity Value = ₹${calculationResult.maturity}

ANSWER: The maturity value is ₹${calculationResult.maturity}

Provide a clear, step-by-step explanation following this format.`;

    case 'reverse_rate':
      return basePrompt + `This is a RATE OF INTEREST calculation problem.

Given Values:
- Monthly Deposit (P) = ₹${P}
- Time Period (n) = ${n} months = ${(n/12).toFixed(1)} years
- Maturity Amount (A) = ₹${A}

SOLUTION:
Step 1: Calculate Total Principal
Principal = P × n = ₹${P} × ${n} = ₹${calculationResult.principal}

Step 2: Calculate Interest Earned
Interest = Maturity Amount - Principal
Interest = ₹${A} - ₹${calculationResult.principal} = ₹${calculationResult.interest}

Step 3: Calculate Rate using rearranged RD formula
From A = P × n + (P × n × (n+1) × r) / (2 × 12 × 100)
Interest = (P × n × (n+1) × r) / (2 × 12 × 100)
Therefore: r = (Interest × 2 × 12 × 100) / (P × n × (n+1))

r = (₹${calculationResult.interest} × 2400) / (₹${P} × ${n} × ${n+1})
r = (₹${calculationResult.interest} × 2400) / (₹${P} × ${n} × ${n+1})
r = ${calculationResult.r}%

ANSWER: The rate of interest is ${calculationResult.r}% per annum

Provide a clear, step-by-step explanation following this format.`;

    case 'monthly_instalment':
      return basePrompt + `This is a MONTHLY INSTALMENT calculation problem.

Given Values:
- Maturity Amount (A) = ₹${A}
- Time Period (n) = ${n} months = ${(n/12).toFixed(1)} years
- Rate of Interest (r) = ${r}% per annum

SOLUTION:
Using the RD formula: A = P × n + (P × n × (n+1) × r) / (2 × 12 × 100)
Rearranging to solve for P:
A = P × n × [1 + (n+1) × r / (2 × 12 × 100)]
P = A / [n × (1 + (n+1) × r / (2 × 12 × 100))]

Step 1: Calculate the coefficient
Coefficient = n × [1 + (n+1) × r / (2 × 12 × 100)]
Coefficient = ${n} × [1 + ${n+1} × ${r} / 2400]
Coefficient = ${n} × [1 + ${((n+1) * r / 2400).toFixed(6)}]
Coefficient = ${(n * (1 + (n + 1) * r / 2400)).toFixed(4)}

Step 2: Calculate Monthly Deposit
P = A / Coefficient
P = ₹${A} / ${(n * (1 + (n + 1) * r / 2400)).toFixed(4)}
P = ₹${calculationResult.P}

VERIFICATION:
- Total Principal = ₹${calculationResult.P} × ${n} = ₹${calculationResult.principal}
- Interest = ₹${calculationResult.interest}
- Maturity Value = ₹${calculationResult.principal} + ₹${calculationResult.interest} = ₹${calculationResult.maturity}

ANSWER: The monthly instalment should be ₹${calculationResult.P}

Provide a clear, step-by-step explanation following this format.`;

    case 'time_calculation':
      return basePrompt + `This is a TIME PERIOD calculation problem.

Given Values:
- Monthly Deposit (P) = ₹${P}
- Maturity Amount (A) = ₹${A}
- Rate of Interest (r) = ${r}% per annum

SOLUTION:
Using the RD formula: A = P × n + (P × n × (n+1) × r) / (2 × 12 × 100)
This becomes a quadratic equation in n:
A = P × n + (P × r × n × (n+1)) / 2400
A = P × n + (P × r × n²) / 2400 + (P × r × n) / 2400
A = (P × r / 2400) × n² + P × (1 + r/2400) × n

Rearranging: (P × r / 2400) × n² + P × (1 + r/2400) × n - A = 0

This is a quadratic equation: an² + bn + c = 0
Where: a = ${(P * r / 2400).toFixed(8)}
       b = ${(P * (1 + r/2400)).toFixed(4)}
       c = -${A}

Using quadratic formula: n = (-b ± √(b² - 4ac)) / 2a

After solving: n = ${calculationResult.n} months = ${calculationResult.years} years

VERIFICATION:
- Total Principal = ₹${P} × ${calculationResult.n} = ₹${calculationResult.principal}
- Interest = ₹${calculationResult.interest}
- Maturity Value = ₹${calculationResult.principal} + ₹${calculationResult.interest} = ₹${calculationResult.maturity}

ANSWER: The time period is ${calculationResult.years} years (${calculationResult.n} months)

Provide a clear, step-by-step explanation following this format.`;

    case 'interest_only':
      return basePrompt + `This is an INTEREST CALCULATION problem.

Given Values:
- Monthly Deposit (P) = ₹${P}
- Time Period (n) = ${n} months = ${(n/12).toFixed(1)} years
- Rate of Interest (r) = ${r}% per annum

SOLUTION:
Using the RD interest formula: Interest = (P × n × (n+1) × r) / (2 × 12 × 100)

Step 1: Calculate Interest
Interest = (₹${P} × ${n} × ${n+1} × ${r}) / 2400
Interest = ₹${calculationResult.interest}

Step 2: Calculate Total Principal (for reference)
Principal = P × n = ₹${P} × ${n} = ₹${calculationResult.principal}

Step 3: Calculate Maturity Value (for reference)
Maturity Value = Principal + Interest = ₹${calculationResult.principal} + ₹${calculationResult.interest} = ₹${calculationResult.maturity}

ANSWER: The interest earned is ₹${calculationResult.interest}

Provide a clear, step-by-step explanation following this format.`;

    default:
      return basePrompt + `I need to understand your question better. Please provide clear information about:
- Monthly deposit amount
- Time period (in years or months)
- Interest rate (% per annum)
- What you want to find (maturity value, rate, monthly deposit, or time period)

Your question: "${originalMessage}"`;
  }
}

app.post("/api/chat", async (req, res) => {
  const userMessage = req.body.message?.trim();
  if (!userMessage) {
    return res.status(400).json({ reply: "⚠️ Please enter a valid RD question." });
  }

  try {
    const { P, A, r, n, allAmounts } = extractRDValues(userMessage);
    const problemType = identifyProblemType(P, A, r, n, userMessage);
    
    console.log(`Parsed values: P=${P}, A=${A}, r=${r}, n=${n}`);
    console.log(`All amounts found: ${allAmounts}`);
    console.log(`Problem type: ${problemType}`);
    
    let calculationResult = null;
    let prompt = "";

    switch (problemType) {
      case 'forward':
        if (!P || !n || !r) {
          throw new Error("Missing required values for maturity calculation");
        }
        calculationResult = calculateForwardRD(P, n, r);
        prompt = generateSolutionPrompt(problemType, calculationResult, userMessage, { P, A, r, n });
        break;

      case 'reverse_rate':
        if (!P || !n || !A) {
          throw new Error("Missing required values for rate calculation");
        }
        calculationResult = calculateReverseRate(P, n, A);
        prompt = generateSolutionPrompt(problemType, calculationResult, userMessage, { P, A, r, n });
        break;

      case 'monthly_instalment':
        if (!A || !n || !r) {
          throw new Error("Missing required values for monthly instalment calculation");
        }
        calculationResult = calculateMonthlyInstalment(A, n, r);
        prompt = generateSolutionPrompt(problemType, calculationResult, userMessage, { P, A, r, n });
        break;

      case 'time_calculation':
        if (!P || !A || !r) {
          throw new Error("Missing required values for time calculation");
        }
        calculationResult = calculateTimeFromMaturity(P, A, r);
        prompt = generateSolutionPrompt(problemType, calculationResult, userMessage, { P, A, r, n });
        break;

      case 'interest_only':
        if (!P || !n || !r) {
          throw new Error("Missing required values for interest calculation");
        }
        calculationResult = calculateInterestOnly(P, n, r);
        prompt = generateSolutionPrompt(problemType, calculationResult, userMessage, { P, A, r, n });
        break;

      case 'comparison':
        // Handle comparison problems (A vs B type questions)
        prompt = `You are an expert ICSE Class 10 Banking and RD tutor. This appears to be a comparison question between two RD accounts.

Student's Question: "${userMessage}"

Please analyze this comparison problem step by step:
1. Identify the two accounts and their parameters
2. Calculate maturity value for each account using RD formula: A = P × n + (P × n × (n+1) × r) / (2 × 12 × 100)
3. Compare the results and determine who gets more money
4. Calculate the difference between the amounts

Show all calculations clearly and provide the final comparison result.`;
        break;

      default:
        const guidance = `I can help you solve RD problems! From your question, I found:

**Detected Values:**
${allAmounts.length > 0 ? `- Amounts: ₹${allAmounts.join(', ₹')}` : '- No clear amounts found'}
${r ? `- Interest Rate: ${r}%` : '- No interest rate found'}
${n ? `- Time Period: ${n} months (${(n/12).toFixed(1)} years)` : '- No time period found'}

**What I can solve:**

1. **Find Maturity Value** 📈
   - Need: Monthly deposit + Time + Interest rate
   - Example: "₹500 monthly for 2 years at 8% interest"

2. **Find Interest Rate** 📊
   - Need: Monthly deposit + Time + Maturity amount
   - Example: "₹300 monthly for 18 months gives ₹6000"

3. **Find Monthly Deposit** 💰
   - Need: Maturity amount + Time + Interest rate
   - Example: "What monthly deposit for ₹50000 in 3 years at 10%?"

4. **Find Time Period** ⏰
   - Need: Monthly deposit + Maturity amount + Interest rate
   - Example: "How long for ₹400 monthly at 12% to get ₹25000?"

5. **Find Interest Only** 🔢
   - Need: Monthly deposit + Time + Interest rate
   - Example: "Interest earned on ₹200 monthly for 36 months at 11%"

6. **Compare Two Accounts** ⚖️
   - Example: "A deposits ₹1200 for 3 years, B deposits ₹1500 for 2 years at 10%"

**Sample Questions from Your PDF:**
- "Kiran deposited ₹200 per month for 36 months at 11% interest. Find maturity value."
- "Ahmed deposits ₹2,500 monthly for 2 years and gets ₹66,250. Find the interest rate."
- "What monthly deposit gives ₹30,000 in 2 years at 8% interest?"

**Your Question:** "${userMessage}"

Please provide clearer values or rephrase your question with specific amounts, time periods, and interest rates.`;
        
        return res.json({ reply: guidance });
    }

    // Generate AI response
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      temperature: 0.1,
      max_tokens: 1500,
      messages: [
        { 
          role: "system", 
          content: `You are an expert ICSE Class 10 Banking and Recurring Deposit tutor. Always:
- Show step-by-step mathematical working
- Use the standard RD formula clearly: A = P × n + (P × n × (n+1) × r) / (2 × 12 × 100)
- Explain each calculation step
- Provide final answers in bold
- Use proper currency formatting (₹)
- Be precise with decimal places
- Follow ICSE exam answer format
- Include verification steps when needed
- Handle all types of RD problems from the syllabus` 
        },
        { role: "user", content: prompt }
      ]
    });

    const reply = completion.data.choices[0].message.content.trim();
    return res.json({ reply });

  } catch (error) {
    console.error("Error:", error.message);
    return res.status(500).json({ 
      reply: `⚠️ Error: ${error.message}. Please check your question format and try again.` 
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "Complete RD Banking Server is running", 
    timestamp: new Date().toISOString(),
    features: [
      "✅ Maturity Value Calculation",
      "✅ Interest Rate Finding",
      "✅ Monthly Instalment Calculation", 
      "✅ Time Period Calculation",
      "✅ Interest-Only Calculation",
      "✅ Account Comparison",
      "✅ ICSE Format Solutions",
      "✅ All PDF Problems Supported",
      "✅ Similar Question Variations"
    ],
    capabilities: [
      "🔍 Smart question parsing",
      "📊 Multiple problem types",
      "🧮 Precise calculations",
      "📚 ICSE compliant solutions",
      "🎯 Context-aware problem identification",
      "✨ Enhanced natural language processing"
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err.stack);
  
  // Set default error status code if not already set
  const statusCode = err.statusCode || err.status || 500;
  
  // Development vs production error responses
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const errorResponse = {
    reply: "⚠️ Internal server error. Please try again later.",
    error: true,
    timestamp: new Date().toISOString()
  };
  
  // In development, include more detailed error info
  if (isDevelopment) {
    errorResponse.details = err.message;
    errorResponse.stack = err.stack;
  }
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    errorResponse.reply = "❌ Invalid input data. Please check your request.";
    return res.status(400).json(errorResponse);
  }
  
  if (err.name === 'CastError') {
    errorResponse.reply = "❌ Invalid ID format.";
    return res.status(400).json(errorResponse);
  }
  
  if (err.code === 11000) {
    errorResponse.reply = "❌ Duplicate entry. This record already exists.";
    return res.status(409).json(errorResponse);
  }
  
  // Default server error response
  res.status(statusCode).json(errorResponse);
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    reply: "🔍 Route not found. Please check the URL and try again.",
    error: true,
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "Server is running", timestamp: new Date().toISOString() });
});
 
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Enhanced RD Banking Server running on port ${PORT}`);
  console.log(`📚 Ready to solve all types of RD problems from ICSE syllabus`);
});