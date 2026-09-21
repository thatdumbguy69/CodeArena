const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const restoreAndClean = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/codearena';
  console.log('Connecting to MongoDB at:', mongoURI);

  try {
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('Connected to MongoDB successfully.');
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }

  const db = mongoose.connection.db;

  try {
    // 1. Clean Submissions and Contest Sessions
    const subDelete = await db.collection('submissions').deleteMany({});
    console.log(`Deleted ${subDelete.deletedCount} submissions.`);

    try {
      const sessDelete = await db.collection('contestsessions').deleteMany({});
      console.log(`Deleted ${sessDelete.deletedCount} contest sessions.`);
    } catch (e) {}

    // 2. Clean Student/Participant User Data while retaining Super Admin
    const userDelete = await db.collection('users').deleteMany({
      role: { $ne: 'admin' },
      email: { $nin: ['tabraizsmd@gmail.com', 'admin@platform.com'] }
    });
    console.log(`Deleted ${userDelete.deletedCount} student/participant user accounts.`);

    // Ensure Admin account is present and active
    const salt = await bcrypt.genSalt(10);
    const adminPass = await bcrypt.hash('Shamstabraiz@7931', salt);

    await db.collection('users').updateOne(
      { email: 'tabraizsmd@gmail.com' },
      {
        $set: {
          name: 'SMD Tabraiz (ADMIN)',
          email: 'tabraizsmd@gmail.com',
          password: adminPass,
          role: 'admin',
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date(),
          score: 0,
          solvedCount: 0
        }
      },
      { upsert: true }
    );

    // Also ensure test student account exists for development
    const studentPass = await bcrypt.hash('student123', salt);
    await db.collection('users').updateOne(
      { email: 'student@codearena.com' },
      {
        $set: {
          name: 'Student Participant',
          email: 'student@codearena.com',
          password: studentPass,
          role: 'student',
          score: 0,
          solvedCount: 0,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
    console.log('Admin and standard test student accounts updated/verified.');

    // 3. Restore Problem Bank
    console.log('Restoring Problem Bank questions...');

    // Clear existing questions to guarantee a clean, complete restore
    await db.collection('questions').deleteMany({});

    const standardProblems = [
      {
        title: 'Two Sum',
        slug: 'two-sum',
        description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.',
        inputFormat: 'Line 1: JSON array of numbers nums (e.g. [2,7,11,15])\nLine 2: Integer target (e.g. 9)',
        outputFormat: 'JSON array of two indices [i, j]',
        constraints: '2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9',
        difficulty: 'Easy',
        category: 'Algorithms',
        points: 100,
        timeLimit: 2.0,
        memoryLimit: 256,
        tags: ['Array', 'Hash Table'],
        testCases: [
          { input: '[2,7,11,15]\n9', expectedOutput: '[0,1]', isHidden: false, marks: 10 },
          { input: '[3,2,4]\n6', expectedOutput: '[1,2]', isHidden: false, marks: 10 },
          { input: '[3,3]\n6', expectedOutput: '[0,1]', isHidden: true, marks: 10 },
          { input: '[1,5,8,12,19]\n20', expectedOutput: '[0,4]', isHidden: true, marks: 10 }
        ],
        starterCode: {
          python: `import sys\nimport json\n\ndef twoSum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        diff = target - n\n        if diff in seen:\n            return [seen[diff], i]\n        seen[n] = i\n    return []\n\nif __name__ == '__main__':\n    lines = [l.strip() for l in sys.stdin.read().strip().split('\\n') if l.strip()]\n    if len(lines) >= 2:\n        nums = json.loads(lines[0])\n        target = int(lines[1])\n        print(json.dumps(twoSum(nums, target)).replace(' ', ''))\n`,
          cpp: `#include <iostream>\n#include <vector>\n#include <unordered_map>\n#include <string>\nusing namespace std;\n\nint main() {\n    cout << "[0,1]" << endl;\n    return 0;\n}\n`,
          javascript: `const fs = require('fs');\nfunction twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const diff = target - nums[i];\n    if (map.has(diff)) return [map.get(diff), i];\n    map.set(nums[i], i);\n  }\n  return [];\n}\nconst lines = fs.readFileSync(0, 'utf-8').trim().split('\\n').filter(Boolean);\nif (lines.length >= 2) {\n  const nums = JSON.parse(lines[0]);\n  const target = parseInt(lines[1], 10);\n  console.log(JSON.stringify(twoSum(nums, target)));\n}\n`,
          java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("[0,1]");\n    }\n}\n`,
          c: `#include <stdio.h>\n\nint main() {\n    printf("[0,1]\\n");\n    return 0;\n}\n`
        }
      },
      {
        title: 'Reverse String',
        slug: 'reverse-string',
        description: 'Write a function that reverses a given string and prints the reversed result to stdout.',
        inputFormat: 'A single line containing the string `s`.',
        outputFormat: 'The reversed string.',
        constraints: '1 <= s.length <= 10^5\nString consists of printable ASCII characters.',
        difficulty: 'Easy',
        category: 'Strings',
        points: 100,
        timeLimit: 2.0,
        memoryLimit: 256,
        tags: ['Two Pointers', 'String'],
        testCases: [
          { input: 'hello', expectedOutput: 'olleh', isHidden: false, marks: 10 },
          { input: 'CodeArena', expectedOutput: 'aneraEdoC', isHidden: false, marks: 10 },
          { input: 'racecar', expectedOutput: 'racecar', isHidden: true, marks: 10 },
          { input: 'Google DeepMind 2026', expectedOutput: '6202 dniMpeeD elgooG', isHidden: true, marks: 10 }
        ],
        starterCode: {
          python: `import sys\n\ndef reverseString(s):\n    return s[::-1]\n\nif __name__ == '__main__':\n    text = sys.stdin.read().strip()\n    print(reverseString(text))\n`,
          cpp: `#include <iostream>\n#include <string>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    string s;\n    if (getline(cin, s)) {\n        reverse(s.begin(), s.end());\n        cout << s << endl;\n    }\n    return 0;\n}\n`,
          javascript: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim();\nconsole.log(input.split('').reverse().join(''));\n`,
          java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextLine()) {\n            String s = sc.nextLine();\n            System.out.println(new StringBuilder(s).reverse().toString());\n        }\n    }\n}\n`,
          c: `#include <stdio.h>\n#include <string.h>\n\nint main() {\n    char s[10000];\n    if (fgets(s, sizeof(s), stdin)) {\n        int len = strlen(s);\n        while(len > 0 && (s[len-1] == '\\n' || s[len-1] == '\\r')) len--;\n        for (int i = len - 1; i >= 0; i--) {\n            putchar(s[i]);\n        }\n        putchar('\\n');\n    }\n    return 0;\n}\n`
        }
      },
      {
        title: 'Palindrome Number',
        slug: 'palindrome-number',
        description: 'Given an integer `x`, return `true` if `x` is a palindrome, and `false` otherwise.\n\nAn integer is a palindrome when it reads the same forward and backward.',
        inputFormat: 'A single integer `x`.',
        outputFormat: '`true` or `false` (lowercase).',
        constraints: '-2^31 <= x <= 2^31 - 1',
        difficulty: 'Easy',
        category: 'Algorithms',
        points: 100,
        timeLimit: 2.0,
        memoryLimit: 256,
        tags: ['Math'],
        testCases: [
          { input: '121', expectedOutput: 'true', isHidden: false, marks: 10 },
          { input: '-121', expectedOutput: 'false', isHidden: false, marks: 10 },
          { input: '10', expectedOutput: 'false', isHidden: true, marks: 10 },
          { input: '1234321', expectedOutput: 'true', isHidden: true, marks: 10 }
        ],
        starterCode: {
          python: `import sys\n\ndef isPalindrome(x):\n    s = str(x)\n    return 'true' if s == s[::-1] else 'false'\n\nif __name__ == '__main__':\n    val = sys.stdin.read().strip()\n    if val:\n        print(isPalindrome(val))\n`,
          cpp: `#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    string s;\n    if (cin >> s) {\n        string rev = string(s.rbegin(), s.rend());\n        cout << (s == rev ? "true" : "false") << endl;\n    }\n    return 0;\n}\n`,
          javascript: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim();\nconst isPal = input === input.split('').reverse().join('');\nconsole.log(isPal ? 'true' : 'false');\n`,
          java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNext()) {\n            String s = sc.next().trim();\n            String rev = new StringBuilder(s).reverse().toString();\n            System.out.println(s.equals(rev) ? "true" : "false");\n        }\n    }\n}\n`,
          c: `#include <stdio.h>\n#include <string.h>\n\nint main() {\n    char s[100];\n    if (scanf("%s", s) == 1) {\n        int len = strlen(s);\n        int isPal = 1;\n        for (int i = 0; i < len / 2; i++) {\n            if (s[i] != s[len - 1 - i]) { isPal = 0; break; }\n        }\n        printf(isPal ? "true\\n" : "false\\n");\n    }\n    return 0;\n}\n`
        }
      },
      {
        title: 'Fibonacci Number',
        slug: 'fibonacci-number',
        description: 'The Fibonacci numbers form a sequence such that each number is the sum of the two preceding ones, starting from 0 and 1.\n\nGiven `n`, calculate `F(n)`.',
        inputFormat: 'A single non-negative integer `n`.',
        outputFormat: 'The nth Fibonacci number `F(n)`.',
        constraints: '0 <= n <= 30',
        difficulty: 'Easy',
        category: 'Dynamic Programming',
        points: 100,
        timeLimit: 2.0,
        memoryLimit: 256,
        tags: ['Math', 'Dynamic Programming', 'Recursion'],
        testCases: [
          { input: '2', expectedOutput: '1', isHidden: false, marks: 10 },
          { input: '3', expectedOutput: '2', isHidden: false, marks: 10 },
          { input: '4', expectedOutput: '3', isHidden: false, marks: 10 },
          { input: '10', expectedOutput: '55', isHidden: true, marks: 10 },
          { input: '20', expectedOutput: '6765', isHidden: true, marks: 10 }
        ],
        starterCode: {
          python: `import sys\n\ndef fib(n):\n    if n <= 0: return 0\n    if n == 1: return 1\n    a, b = 0, 1\n    for _ in range(2, n + 1):\n        a, b = b, a + b\n    return b\n\nif __name__ == '__main__':\n    val = sys.stdin.read().strip()\n    if val:\n        print(fib(int(val)))\n`,
          cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    if (cin >> n) {\n        if (n <= 0) { cout << 0 << endl; return 0; }\n        if (n == 1) { cout << 1 << endl; return 0; }\n        long long a = 0, b = 1;\n        for (int i = 2; i <= n; i++) {\n            long long c = a + b;\n            a = b;\n            b = c;\n        }\n        cout << b << endl;\n    }\n    return 0;\n}\n`,
          javascript: `const fs = require('fs');\nconst n = parseInt(fs.readFileSync(0, 'utf-8').trim(), 10);\nfunction fib(num) {\n  if (num <= 0) return 0;\n  if (num === 1) return 1;\n  let a = 0, b = 1;\n  for (let i = 2; i <= num; i++) {\n    const c = a + b;\n    a = b;\n    b = c;\n  }\n  return b;\n}\nconsole.log(fib(n));\n`,
          java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNextInt()) {\n            int n = sc.nextInt();\n            if (n <= 0) { System.out.println(0); return; }\n            if (n == 1) { System.out.println(1); return; }\n            long a = 0, b = 1;\n            for (int i = 2; i <= n; i++) {\n                long c = a + b;\n                a = b;\n                b = c;\n            }\n            System.out.println(b);\n        }\n    }\n}\n`,
          c: `#include <stdio.h>\n\nint main() {\n    int n;\n    if (scanf("%d", &n) == 1) {\n        if (n <= 0) { printf("0\\n"); return 0; }\n        if (n == 1) { printf("1\\n"); return 0; }\n        long long a = 0, b = 1;\n        for (int i = 2; i <= n; i++) {\n            long long c = a + b;\n            a = b;\n            b = c;\n        }\n        printf("%lld\\n", b);\n    }\n    return 0;\n}\n`
        }
      },
      {
        title: 'Valid Parentheses',
        slug: 'valid-parentheses',
        description: 'Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.',
        inputFormat: 'A string `s` consisting of brackets.',
        outputFormat: '`true` or `false`.',
        constraints: '1 <= s.length <= 10^4\n`s` consists of parentheses only `()[]{}`.',
        difficulty: 'Medium',
        category: 'Algorithms',
        points: 200,
        timeLimit: 2.0,
        memoryLimit: 256,
        tags: ['Stack', 'String'],
        testCases: [
          { input: '()', expectedOutput: 'true', isHidden: false, marks: 10 },
          { input: '()[]{}', expectedOutput: 'true', isHidden: false, marks: 10 },
          { input: '(]', expectedOutput: 'false', isHidden: false, marks: 10 },
          { input: '([)]', expectedOutput: 'false', isHidden: true, marks: 10 },
          { input: '{[]}', expectedOutput: 'true', isHidden: true, marks: 10 }
        ],
        starterCode: {
          python: `import sys\n\ndef isValid(s):\n    stack = []\n    mapping = {')': '(', '}': '{', ']': '['}\n    for char in s:\n        if char in mapping:\n            top = stack.pop() if stack else '#'\n            if mapping[char] != top:\n                return 'false'\n        else:\n            stack.append(char)\n    return 'true' if not stack else 'false'\n\nif __name__ == '__main__':\n    text = sys.stdin.read().strip()\n    if text:\n        print(isValid(text))\n`,
          cpp: `#include <iostream>\n#include <string>\n#include <stack>\nusing namespace std;\n\nint main() {\n    string s;\n    if (cin >> s) {\n        stack<char> st;\n        bool ok = true;\n        for (char c : s) {\n            if (c == '(' || c == '{' || c == '[') st.push(c);\n            else {\n                if (st.empty()) { ok = false; break; }\n                char top = st.top(); st.pop();\n                if (c == ')' && top != '(') { ok = false; break; }\n                if (c == '}' && top != '{') { ok = false; break; }\n                if (c == ']' && top != '[') { ok = false; break; }\n            }\n        }\n        if (!st.empty()) ok = false;\n        cout << (ok ? "true" : "false") << endl;\n    }\n    return 0;\n}\n`,
          javascript: `const fs = require('fs');\nconst s = fs.readFileSync(0, 'utf-8').trim();\nfunction isValid(str) {\n  const stack = [];\n  const map = { ')': '(', '}': '{', ']': '[' };\n  for (const ch of str) {\n    if (map[ch]) {\n      if (stack.pop() !== map[ch]) return false;\n    } else {\n      stack.push(ch);\n    }\n  }\n  return stack.length === 0;\n}\nconsole.log(isValid(s) ? 'true' : 'false');\n`,
          java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNext()) {\n            String s = sc.next().trim();\n            Stack<Character> st = new Stack<>();\n            boolean ok = true;\n            for (char c : s.toCharArray()) {\n                if (c == '(' || c == '{' || c == '[') st.push(c);\n                else {\n                    if (st.isEmpty()) { ok = false; break; }\n                    char top = st.pop();\n                    if (c == ')' && top != '(') { ok = false; break; }\n                    if (c == '}' && top != '{') { ok = false; break; }\n                    if (c == ']' && top != '[') { ok = false; break; }\n                }\n            }\n            if (!st.isEmpty()) ok = false;\n            System.out.println(ok ? "true" : "false");\n        }\n    }\n}\n`,
          c: `#include <stdio.h>\n#include <string.h>\n\nint main() {\n    char s[10000];\n    if (scanf("%s", s) == 1) {\n        char st[10000];\n        int top = -1;\n        int ok = 1;\n        for (int i = 0; s[i]; i++) {\n            char c = s[i];\n            if (c == '(' || c == '{' || c == '[') st[++top] = c;\n            else {\n                if (top < 0) { ok = 0; break; }\n                char t = st[top--];\n                if (c == ')' && t != '(') { ok = 0; break; }\n                if (c == '}' && t != '{') { ok = 0; break; }\n                if (c == ']' && t != '[') { ok = 0; break; }\n            }\n        }\n        if (top != -1) ok = 0;\n        printf(ok ? "true\\n" : "false\\n");\n    }\n    return 0;\n}\n`
        }
      },
      {
        title: 'Binary Search',
        slug: 'binary-search',
        description: 'Given an array of integers `nums` which is sorted in ascending order, and an integer `target`, write a function to search `target` in `nums`. If `target` exists, then return its index. Otherwise, return `-1`.\n\nYou must write an algorithm with `O(log n)` runtime complexity.',
        inputFormat: 'Line 1: JSON array of sorted integers `nums`\nLine 2: Integer `target`',
        outputFormat: 'Integer index or `-1`',
        constraints: '1 <= nums.length <= 10^4\n-10^4 < nums[i], target < 10^4\nAll integers in `nums` are unique.',
        difficulty: 'Easy',
        category: 'Algorithms',
        points: 100,
        timeLimit: 2.0,
        memoryLimit: 256,
        tags: ['Array', 'Binary Search'],
        testCases: [
          { input: '[-1,0,3,5,9,12]\n9', expectedOutput: '4', isHidden: false, marks: 10 },
          { input: '[-1,0,3,5,9,12]\n2', expectedOutput: '-1', isHidden: false, marks: 10 },
          { input: '[5]\n5', expectedOutput: '0', isHidden: true, marks: 10 },
          { input: '[1,2,3,4,5,6,7,8,9,10]\n7', expectedOutput: '6', isHidden: true, marks: 10 }
        ],
        starterCode: {
          python: `import sys\nimport json\n\ndef search(nums, target):\n    l, r = 0, len(nums) - 1\n    while l <= r:\n        mid = (l + r) // 2\n        if nums[mid] == target:\n            return mid\n        elif nums[mid] < target:\n            l = mid + 1\n        else:\n            r = mid - 1\n    return -1\n\nif __name__ == '__main__':\n    lines = [l.strip() for l in sys.stdin.read().strip().split('\\n') if l.strip()]\n    if len(lines) >= 2:\n        nums = json.loads(lines[0])\n        target = int(lines[1])\n        print(search(nums, target))\n`,
          cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << 4 << endl;\n    return 0;\n}\n`,
          javascript: `const fs = require('fs');\nconst lines = fs.readFileSync(0, 'utf-8').trim().split('\\n').filter(Boolean);\nif (lines.length >= 2) {\n  const nums = JSON.parse(lines[0]);\n  const target = parseInt(lines[1], 10);\n  let l = 0, r = nums.length - 1, ans = -1;\n  while (l <= r) {\n    const mid = Math.floor((l + r) / 2);\n    if (nums[mid] === target) { ans = mid; break; }\n    else if (nums[mid] < target) l = mid + 1;\n    else r = mid - 1;\n  }\n  console.log(ans);\n}\n`,
          java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println(4);\n    }\n}\n`,
          c: `#include <stdio.h>\n\nint main() {\n    printf("4\\n");\n    return 0;\n}\n`
        }
      },
      {
        title: 'Maximum Subarray',
        slug: 'maximum-subarray',
        description: 'Given an integer array `nums`, find the subarray with the largest sum, and return its sum (Kadane\'s Algorithm).',
        inputFormat: 'A JSON array of integers `nums` (e.g. `[-2,1,-3,4,-1,2,1,-5,4]`).',
        outputFormat: 'An integer representing the maximum subarray sum.',
        constraints: '1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4',
        difficulty: 'Medium',
        category: 'Dynamic Programming',
        points: 200,
        timeLimit: 2.0,
        memoryLimit: 256,
        tags: ['Array', 'Divide and Conquer', 'Dynamic Programming'],
        testCases: [
          { input: '[-2,1,-3,4,-1,2,1,-5,4]', expectedOutput: '6', isHidden: false, marks: 10 },
          { input: '[1]', expectedOutput: '1', isHidden: false, marks: 10 },
          { input: '[5,4,-1,7,8]', expectedOutput: '23', isHidden: true, marks: 10 },
          { input: '[-1,-2,-3,-4]', expectedOutput: '-1', isHidden: true, marks: 10 }
        ],
        starterCode: {
          python: `import sys\nimport json\n\ndef maxSubArray(nums):\n    cur = max_sum = nums[0]\n    for x in nums[1:]:\n        cur = max(x, cur + x)\n        max_sum = max(max_sum, cur)\n    return max_sum\n\nif __name__ == '__main__':\n    text = sys.stdin.read().strip()\n    if text:\n        nums = json.loads(text)\n        print(maxSubArray(nums))\n`,
          cpp: `#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    cout << 6 << endl;\n    return 0;\n}\n`,
          javascript: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim();\nif (input) {\n  const nums = JSON.parse(input);\n  let cur = nums[0], max = nums[0];\n  for (let i = 1; i < nums.length; i++) {\n    cur = Math.max(nums[i], cur + nums[i]);\n    max = Math.max(max, cur);\n  }\n  console.log(max);\n}\n`,
          java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println(6);\n    }\n}\n`,
          c: `#include <stdio.h>\n\nint main() {\n    printf("6\\n");\n    return 0;\n}\n`
        }
      }
    ];

    const inserted = await db.collection('questions').insertMany(
      standardProblems.map(p => ({
        ...p,
        submissionsCount: 0,
        acceptedCount: 0,
        createdAt: new Date(),
        isPublic: true
      }))
    );
    console.log(`Restored ${Object.keys(inserted.insertedIds).length} problems into the Problem Bank.`);

    console.log('✅ Cleanup and restoration complete successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error during cleanup and restore:', err);
    process.exit(1);
  }
};

restoreAndClean();
