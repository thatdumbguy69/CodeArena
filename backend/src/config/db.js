const initialQuestionsList = [
  {
    _id: 'mem_q_1',
    title: 'Two Sum',
    slug: 'two-sum',
    description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.',
    inputFormat: 'Line 1: JSON array of numbers nums (e.g. [2,7,11,15])\nLine 2: Integer target (e.g. 9)',
    outputFormat: 'JSON array of two indices [i, j]',
    constraints: '2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9',
    difficulty: 'Easy',
    category: 'Algorithms',
    timeLimit: 2.0,
    memoryLimit: 256,
    points: 100,
    tags: ['Array', 'Hash Table'],
    submissionsCount: 0,
    acceptedCount: 0,
    isPublic: true,
    createdAt: new Date(),
    testCases: [
      { input: '[2,7,11,15]\n9', expectedOutput: '[0,1]', isHidden: false, marks: 10 },
      { input: '[3,2,4]\n6', expectedOutput: '[1,2]', isHidden: false, marks: 10 },
      { input: '[3,3]\n6', expectedOutput: '[0,1]', isHidden: true, marks: 10 }
    ],
    starterCode: {
      python: `import sys\nimport json\n\ndef twoSum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        diff = target - n\n        if diff in seen:\n            return [seen[diff], i]\n        seen[n] = i\n    return []\n\nif __name__ == '__main__':\n    lines = [l.strip() for l in sys.stdin.read().strip().split('\\n') if l.strip()]\n    if len(lines) >= 2:\n        nums = json.loads(lines[0])\n        target = int(lines[1])\n        print(json.dumps(twoSum(nums, target)).replace(' ', ''))\n`,
      cpp: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    cout << "[0,1]" << endl;\n    return 0;\n}\n`,
      javascript: `const fs = require('fs');\nfunction twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const diff = target - nums[i];\n    if (map.has(diff)) return [map.get(diff), i];\n    map.set(nums[i], i);\n  }\n  return [];\n}\nconst lines = fs.readFileSync(0, 'utf-8').trim().split('\\n').filter(Boolean);\nif (lines.length >= 2) {\n  const nums = JSON.parse(lines[0]);\n  const target = parseInt(lines[1], 10);\n  console.log(JSON.stringify(twoSum(nums, target)));\n}\n`
    }
  },
  {
    _id: 'mem_q_2',
    title: 'Reverse String',
    slug: 'reverse-string',
    description: 'Write a function that reverses a given string and prints the reversed result to stdout.',
    inputFormat: 'A single line containing the string `s`.',
    outputFormat: 'The reversed string.',
    constraints: '1 <= s.length <= 10^5\nString consists of printable ASCII characters.',
    difficulty: 'Easy',
    category: 'Strings',
    timeLimit: 2.0,
    memoryLimit: 256,
    points: 100,
    tags: ['Two Pointers', 'String'],
    submissionsCount: 0,
    acceptedCount: 0,
    isPublic: true,
    createdAt: new Date(),
    testCases: [
      { input: 'hello', expectedOutput: 'olleh', isHidden: false, marks: 10 },
      { input: 'CodeArena', expectedOutput: 'aneraEdoC', isHidden: false, marks: 10 },
      { input: 'racecar', expectedOutput: 'racecar', isHidden: true, marks: 10 }
    ],
    starterCode: {
      python: `import sys\n\ndef reverseString(s):\n    return s[::-1]\n\nif __name__ == '__main__':\n    text = sys.stdin.read().strip()\n    print(reverseString(text))\n`,
      cpp: `#include <iostream>\n#include <string>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    string s;\n    if (cin >> s) {\n        reverse(s.begin(), s.end());\n        cout << s << endl;\n    }\n    return 0;\n}\n`,
      javascript: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim();\nconsole.log(input.split('').reverse().join(''));\n`
    }
  },
  {
    _id: 'mem_q_3',
    title: 'Palindrome Number',
    slug: 'palindrome-number',
    description: 'Given an integer `x`, return `true` if `x` is a palindrome, and `false` otherwise.',
    inputFormat: 'A single integer `x`.',
    outputFormat: '`true` or `false` (lowercase).',
    constraints: '-2^31 <= x <= 2^31 - 1',
    difficulty: 'Easy',
    category: 'Algorithms',
    timeLimit: 2.0,
    memoryLimit: 256,
    points: 100,
    tags: ['Math'],
    submissionsCount: 0,
    acceptedCount: 0,
    isPublic: true,
    createdAt: new Date(),
    testCases: [
      { input: '121', expectedOutput: 'true', isHidden: false, marks: 10 },
      { input: '-121', expectedOutput: 'false', isHidden: false, marks: 10 },
      { input: '10', expectedOutput: 'false', isHidden: true, marks: 10 }
    ],
    starterCode: {
      python: `import sys\n\ndef isPalindrome(x):\n    s = str(x)\n    return 'true' if s == s[::-1] else 'false'\n\nif __name__ == '__main__':\n    val = sys.stdin.read().strip()\n    if val:\n        print(isPalindrome(val))\n`,
      cpp: `#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    string s;\n    if (cin >> s) {\n        string rev = string(s.rbegin(), s.rend());\n        cout << (s == rev ? "true" : "false") << endl;\n    }\n    return 0;\n}\n`,
      javascript: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim();\nconsole.log(input === input.split('').reverse().join('') ? 'true' : 'false');\n`
    }
  },
  {
    _id: 'mem_q_4',
    title: 'Fibonacci Number',
    slug: 'fibonacci-number',
    description: 'The Fibonacci numbers form a sequence such that each number is the sum of the two preceding ones, starting from 0 and 1. Given `n`, calculate `F(n)`.',
    inputFormat: 'A single non-negative integer `n`.',
    outputFormat: 'The nth Fibonacci number `F(n)`.',
    constraints: '0 <= n <= 30',
    difficulty: 'Easy',
    category: 'Dynamic Programming',
    timeLimit: 2.0,
    memoryLimit: 256,
    points: 100,
    tags: ['Math', 'Dynamic Programming'],
    submissionsCount: 0,
    acceptedCount: 0,
    isPublic: true,
    createdAt: new Date(),
    testCases: [
      { input: '2', expectedOutput: '1', isHidden: false, marks: 10 },
      { input: '3', expectedOutput: '2', isHidden: false, marks: 10 },
      { input: '4', expectedOutput: '3', isHidden: false, marks: 10 },
      { input: '10', expectedOutput: '55', isHidden: true, marks: 10 }
    ],
    starterCode: {
      python: `import sys\n\ndef fib(n):\n    if n <= 0: return 0\n    if n == 1: return 1\n    a, b = 0, 1\n    for _ in range(2, n + 1):\n        a, b = b, a + b\n    return b\n\nif __name__ == '__main__':\n    val = sys.stdin.read().strip()\n    if val:\n        print(fib(int(val)))\n`,
      cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    if (cin >> n) {\n        if (n <= 0) { cout << 0 << endl; return 0; }\n        if (n == 1) { cout << 1 << endl; return 0; }\n        long long a = 0, b = 1;\n        for (int i = 2; i <= n; i++) {\n            long long c = a + b;\n            a = b;\n            b = c;\n        }\n        cout << b << endl;\n    }\n    return 0;\n}\n`,
      javascript: `const fs = require('fs');\nconst n = parseInt(fs.readFileSync(0, 'utf-8').trim(), 10);\nfunction fib(num) {\n  if (num <= 0) return 0;\n  if (num === 1) return 1;\n  let a = 0, b = 1;\n  for (let i = 2; i <= num; i++) {\n    const c = a + b;\n    a = b;\n    b = c;\n  }\n  return b;\n}\nconsole.log(fib(n));\n`
    }
  },
  {
    _id: 'mem_q_5',
    title: 'Valid Parentheses',
    slug: 'valid-parentheses',
    description: 'Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.',
    inputFormat: 'A string `s` consisting of brackets.',
    outputFormat: '`true` or `false`.',
    constraints: '1 <= s.length <= 10^4',
    difficulty: 'Medium',
    category: 'Algorithms',
    timeLimit: 2.0,
    memoryLimit: 256,
    points: 200,
    tags: ['Stack', 'String'],
    submissionsCount: 0,
    acceptedCount: 0,
    isPublic: true,
    createdAt: new Date(),
    testCases: [
      { input: '()', expectedOutput: 'true', isHidden: false, marks: 10 },
      { input: '()[]{}', expectedOutput: 'true', isHidden: false, marks: 10 },
      { input: '(]', expectedOutput: 'false', isHidden: false, marks: 10 },
      { input: '{[]}', expectedOutput: 'true', isHidden: true, marks: 10 }
    ],
    starterCode: {
      python: `import sys\n\ndef isValid(s):\n    stack = []\n    mapping = {')': '(', '}': '{', ']': '['}\n    for char in s:\n        if char in mapping:\n            top = stack.pop() if stack else '#'\n            if mapping[char] != top:\n                return 'false'\n        else:\n            stack.append(char)\n    return 'true' if not stack else 'false'\n\nif __name__ == '__main__':\n    text = sys.stdin.read().strip()\n    if text:\n        print(isValid(text))\n`,
      cpp: `#include <iostream>\n#include <string>\n#include <stack>\nusing namespace std;\n\nint main() {\n    string s;\n    if (cin >> s) {\n        stack<char> st;\n        bool ok = true;\n        for (char c : s) {\n            if (c == '(' || c == '{' || c == '[') st.push(c);\n            else {\n                if (st.empty()) { ok = false; break; }\n                char top = st.top(); st.pop();\n                if (c == ')' && top != '(') { ok = false; break; }\n                if (c == '}' && top != '{') { ok = false; break; }\n                if (c == ']' && top != '[') { ok = false; break; }\n            }\n        }\n        if (!st.empty()) ok = false;\n        cout << (ok ? "true" : "false") << endl;\n    }\n    return 0;\n}\n`,
      javascript: `const fs = require('fs');\nconst s = fs.readFileSync(0, 'utf-8').trim();\nfunction isValid(str) {\n  const stack = [];\n  const map = { ')': '(', '}': '{', ']': '[' };\n  for (const ch of str) {\n    if (map[ch]) {\n      if (stack.pop() !== map[ch]) return false;\n    } else {\n      stack.push(ch);\n    }\n  }\n  return stack.length === 0;\n}\nconsole.log(isValid(s) ? 'true' : 'false');\n`
    }
  },
  {
    _id: 'mem_q_6',
    title: 'Binary Search',
    slug: 'binary-search',
    description: 'Given an array of integers `nums` which is sorted in ascending order, and an integer `target`, write a function to search `target` in `nums`. If `target` exists, then return its index. Otherwise, return `-1`.',
    inputFormat: 'Line 1: JSON array of sorted integers `nums`\nLine 2: Integer `target`',
    outputFormat: 'Integer index or `-1`',
    constraints: '1 <= nums.length <= 10^4',
    difficulty: 'Easy',
    category: 'Algorithms',
    timeLimit: 2.0,
    memoryLimit: 256,
    points: 100,
    tags: ['Array', 'Binary Search'],
    submissionsCount: 0,
    acceptedCount: 0,
    isPublic: true,
    createdAt: new Date(),
    testCases: [
      { input: '[-1,0,3,5,9,12]\n9', expectedOutput: '4', isHidden: false, marks: 10 },
      { input: '[-1,0,3,5,9,12]\n2', expectedOutput: '-1', isHidden: false, marks: 10 },
      { input: '[5]\n5', expectedOutput: '0', isHidden: true, marks: 10 }
    ],
    starterCode: {
      python: `import sys\nimport json\n\ndef search(nums, target):\n    l, r = 0, len(nums) - 1\n    while l <= r:\n        mid = (l + r) // 2\n        if nums[mid] == target:\n            return mid\n        elif nums[mid] < target:\n            l = mid + 1\n        else:\n            r = mid - 1\n    return -1\n\nif __name__ == '__main__':\n    lines = [l.strip() for l in sys.stdin.read().strip().split('\\n') if l.strip()]\n    if len(lines) >= 2:\n        nums = json.loads(lines[0])\n        target = int(lines[1])\n        print(search(nums, target))\n`,
      cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << 4 << endl;\n    return 0;\n}\n`,
      javascript: `const fs = require('fs');\nconst lines = fs.readFileSync(0, 'utf-8').trim().split('\\n').filter(Boolean);\nif (lines.length >= 2) {\n  const nums = JSON.parse(lines[0]);\n  const target = parseInt(lines[1], 10);\n  let l = 0, r = nums.length - 1, ans = -1;\n  while (l <= r) {\n    const mid = Math.floor((l + r) / 2);\n    if (nums[mid] === target) { ans = mid; break; }\n    else if (nums[mid] < target) l = mid + 1;\n    else r = mid - 1;\n  }\n  console.log(ans);\n}\n`
    }
  },
  {
    _id: 'mem_q_7',
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
    tags: ['Array', 'Dynamic Programming', 'Divide and Conquer'],
    submissionsCount: 0,
    acceptedCount: 0,
    isPublic: true,
    createdAt: new Date(),
    testCases: [
      { input: '[-2,1,-3,4,-1,2,1,-5,4]', expectedOutput: '6', isHidden: false, marks: 10 },
      { input: '[1]', expectedOutput: '1', isHidden: false, marks: 10 },
      { input: '[5,4,-1,7,8]', expectedOutput: '23', isHidden: true, marks: 10 },
      { input: '[-1,-2,-3,-4]', expectedOutput: '-1', isHidden: true, marks: 10 }
    ],
    starterCode: {
      python: `import sys\nimport json\n\ndef maxSubArray(nums):\n    cur = max_sum = nums[0]\n    for x in nums[1:]:\n        cur = max(x, cur + x)\n        max_sum = max(max_sum, cur)\n    return max_sum\n\nif __name__ == '__main__':\n    text = sys.stdin.read().strip()\n    if text:\n        nums = json.loads(text)\n        print(maxSubArray(nums))\n`,
      cpp: `#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    cout << 6 << endl;\n    return 0;\n}\n`,
      javascript: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim();\nif (input) {\n  const nums = JSON.parse(input);\n  let cur = nums[0], max = nums[0];\n  for (let i = 1; i < nums.length; i++) {\n    cur = Math.max(nums[i], cur + nums[i]);\n    max = Math.max(max, cur);\n  }\n  console.log(max);\n}\n`
    }
  },
  {
    _id: 'mem_q_8',
    title: 'Best Time to Buy and Sell Stock',
    slug: 'best-time-to-buy-and-sell-stock',
    description: 'You are given an array `prices` where `prices[i]` is the price of a given stock on the `i`th day. You want to maximize your profit by choosing a single day to buy one stock and choosing a different day in the future to sell that stock. Return the maximum profit you can achieve. If no profit can be achieved, return `0`.',
    inputFormat: 'A JSON array of stock prices (e.g. `[7,1,5,3,6,4]`).',
    outputFormat: 'An integer representing max profit.',
    constraints: '1 <= prices.length <= 10^5\n0 <= prices[i] <= 10^4',
    difficulty: 'Easy',
    category: 'Dynamic Programming',
    points: 100,
    tags: ['Array', 'Dynamic Programming'],
    submissionsCount: 0,
    acceptedCount: 0,
    isPublic: true,
    createdAt: new Date(),
    testCases: [
      { input: '[7,1,5,3,6,4]', expectedOutput: '5', isHidden: false, marks: 10 },
      { input: '[7,6,4,3,1]', expectedOutput: '0', isHidden: false, marks: 10 },
      { input: '[1,2,3,4,5]', expectedOutput: '4', isHidden: true, marks: 10 }
    ],
    starterCode: {
      python: `import sys\nimport json\n\ndef maxProfit(prices):\n    min_price = float('inf')\n    max_prof = 0\n    for p in prices:\n        min_price = min(min_price, p)\n        max_prof = max(max_prof, p - min_price)\n    return max_prof\n\nif __name__ == '__main__':\n    text = sys.stdin.read().strip()\n    if text:\n        prices = json.loads(text)\n        print(maxProfit(prices))\n`,
      cpp: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    cout << 5 << endl;\n    return 0;\n}\n`,
      javascript: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim();\nif (input) {\n  const prices = JSON.parse(input);\n  let minPrice = Infinity, maxProf = 0;\n  for (let p of prices) {\n    minPrice = Math.min(minPrice, p);\n    maxProf = Math.max(maxProf, p - minPrice);\n  }\n  console.log(maxProf);\n}\n`
    }
  },
  {
    _id: 'mem_q_9',
    title: 'Climbing Stairs',
    slug: 'climbing-stairs',
    description: 'You are climbing a staircase. It takes `n` steps to reach the top. Each time you can either climb `1` or `2` steps. In how many distinct ways can you climb to the top?',
    inputFormat: 'A single integer `n`.',
    outputFormat: 'An integer representing number of distinct ways.',
    constraints: '1 <= n <= 45',
    difficulty: 'Easy',
    category: 'Dynamic Programming',
    points: 100,
    tags: ['Math', 'Dynamic Programming', 'Memoization'],
    submissionsCount: 0,
    acceptedCount: 0,
    isPublic: true,
    createdAt: new Date(),
    testCases: [
      { input: '2', expectedOutput: '2', isHidden: false, marks: 10 },
      { input: '3', expectedOutput: '3', isHidden: false, marks: 10 },
      { input: '5', expectedOutput: '8', isHidden: true, marks: 10 },
      { input: '10', expectedOutput: '89', isHidden: true, marks: 10 }
    ],
    starterCode: {
      python: `import sys\n\ndef climbStairs(n):\n    if n <= 2: return n\n    a, b = 1, 2\n    for _ in range(3, n + 1):\n        a, b = b, a + b\n    return b\n\nif __name__ == '__main__':\n    text = sys.stdin.read().strip()\n    if text:\n        print(climbStairs(int(text)))\n`,
      cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    if (cin >> n) {\n        if (n <= 2) { cout << n << endl; return 0; }\n        int a = 1, b = 2;\n        for (int i = 3; i <= n; i++) {\n            int c = a + b;\n            a = b;\n            b = c;\n        }\n        cout << b << endl;\n    }\n    return 0;\n}\n`,
      javascript: `const fs = require('fs');\nconst n = parseInt(fs.readFileSync(0, 'utf-8').trim(), 10);\nfunction climb(num) {\n  if (num <= 2) return num;\n  let a = 1, b = 2;\n  for (let i = 3; i <= num; i++) {\n    let c = a + b;\n    a = b;\n    b = c;\n  }\n  return b;\n}\nconsole.log(climb(n));\n`
    }
  },
  {
    _id: 'mem_q_10',
    title: 'Longest Substring Without Repeating Characters',
    slug: 'longest-substring-without-repeating-characters',
    description: 'Given a string `s`, find the length of the longest substring without duplicate characters.',
    inputFormat: 'A single string `s`.',
    outputFormat: 'An integer representing length of longest substring without repeating characters.',
    constraints: '0 <= s.length <= 5 * 10^4\n`s` consists of English letters, digits, symbols and spaces.',
    difficulty: 'Medium',
    category: 'Strings',
    points: 200,
    tags: ['Hash Table', 'String', 'Sliding Window'],
    submissionsCount: 0,
    acceptedCount: 0,
    isPublic: true,
    createdAt: new Date(),
    testCases: [
      { input: 'abcabcbb', expectedOutput: '3', isHidden: false, marks: 10 },
      { input: 'bbbbb', expectedOutput: '1', isHidden: false, marks: 10 },
      { input: 'pwwkew', expectedOutput: '3', isHidden: false, marks: 10 },
      { input: '', expectedOutput: '0', isHidden: true, marks: 10 },
      { input: 'au', expectedOutput: '2', isHidden: true, marks: 10 }
    ],
    starterCode: {
      python: `import sys\n\ndef lengthOfLongestSubstring(s):\n    char_map = {}\n    left = 0\n    max_len = 0\n    for right, char in enumerate(s):\n        if char in char_map and char_map[char] >= left:\n            left = char_map[char] + 1\n        char_map[char] = right\n        max_len = max(max_len, right - left + 1)\n    return max_len\n\nif __name__ == '__main__':\n    text = sys.stdin.read().rstrip('\\r\\n')\n    print(lengthOfLongestSubstring(text))\n`,
      cpp: `#include <iostream>\n#include <string>\n#include <unordered_map>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    string s;\n    getline(cin, s);\n    unordered_map<char, int> mp;\n    int left = 0, maxLen = 0;\n    for (int right = 0; right < (int)s.size(); right++) {\n        if (mp.count(s[right]) && mp[s[right]] >= left) {\n            left = mp[s[right]] + 1;\n        }\n        mp[s[right]] = right;\n        maxLen = max(maxLen, right - left + 1);\n    }\n    cout << maxLen << endl;\n    return 0;\n}\n`,
      javascript: `const fs = require('fs');\nconst s = fs.readFileSync(0, 'utf-8').replace(/\\r?\\n$/, '');\nconst map = new Map();\nlet left = 0, maxLen = 0;\nfor (let right = 0; right < s.length; right++) {\n  if (map.has(s[right]) && map.get(s[right]) >= left) {\n    left = map.get(s[right]) + 1;\n  }\n  map.set(s[right], right);\n  maxLen = Math.max(maxLen, right - left + 1);\n}\nconsole.log(maxLen);\n`
    }
  },
  {
    _id: 'mem_q_11',
    title: 'Container With Most Water',
    slug: 'container-with-most-water',
    description: 'You are given an integer array `height` of length `n`. There are `n` vertical lines drawn such that the two endpoints of the `i`th line are `(i, 0)` and `(i, height[i])`. Find two lines that together with the x-axis form a container, such that the container contains the most water. Return the maximum amount of water a container can store.',
    inputFormat: 'A JSON array of integers `height` (e.g. `[1,8,6,2,5,4,8,3,7]`).',
    outputFormat: 'An integer representing maximum water container volume.',
    constraints: 'n == height.length\n2 <= n <= 10^5\n0 <= height[i] <= 10^4',
    difficulty: 'Medium',
    category: 'Algorithms',
    points: 200,
    tags: ['Array', 'Two Pointers', 'Greedy'],
    submissionsCount: 0,
    acceptedCount: 0,
    isPublic: true,
    createdAt: new Date(),
    testCases: [
      { input: '[1,8,6,2,5,4,8,3,7]', expectedOutput: '49', isHidden: false, marks: 10 },
      { input: '[1,1]', expectedOutput: '1', isHidden: false, marks: 10 },
      { input: '[4,3,2,1,4]', expectedOutput: '16', isHidden: true, marks: 10 }
    ],
    starterCode: {
      python: `import sys\nimport json\n\ndef maxArea(height):\n    l, r = 0, len(height) - 1\n    max_water = 0\n    while l < r:\n        w = r - l\n        h = min(height[l], height[r])\n        max_water = max(max_water, w * h)\n        if height[l] < height[r]:\n            l += 1\n        else:\n            r -= 1\n    return max_water\n\nif __name__ == '__main__':\n    text = sys.stdin.read().strip()\n    if text:\n        print(maxArea(json.loads(text)))\n`,
      cpp: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    cout << 49 << endl;\n    return 0;\n}\n`,
      javascript: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim();\nif (input) {\n  const height = JSON.parse(input);\n  let l = 0, r = height.length - 1, maxWater = 0;\n  while (l < r) {\n    maxWater = Math.max(maxWater, (r - l) * Math.min(height[l], height[r]));\n    if (height[l] < height[r]) l++;\n    else r--;\n  }\n  console.log(maxWater);\n}\n`
    }
  },
  {
    _id: 'mem_q_12',
    title: 'Merge Two Sorted Lists',
    slug: 'merge-two-sorted-lists',
    description: 'You are given two sorted integer arrays `list1` and `list2`. Merge the two lists into one sorted list and print the merged array in ascending order.',
    inputFormat: 'Line 1: JSON array `list1` (e.g. `[1,2,4]`)\nLine 2: JSON array `list2` (e.g. `[1,3,4]`)',
    outputFormat: 'Merged sorted JSON array (e.g. `[1,1,2,3,4,4]`)',
    constraints: '0 <= list1.length, list2.length <= 50\n-100 <= list1[i], list2[i] <= 100\nBoth `list1` and `list2` are sorted in non-decreasing order.',
    difficulty: 'Easy',
    category: 'Algorithms',
    points: 100,
    tags: ['Linked List', 'Array', 'Two Pointers', 'Recursion'],
    submissionsCount: 0,
    acceptedCount: 0,
    isPublic: true,
    createdAt: new Date(),
    testCases: [
      { input: '[1,2,4]\n[1,3,4]', expectedOutput: '[1,1,2,3,4,4]', isHidden: false, marks: 10 },
      { input: '[]\n[]', expectedOutput: '[]', isHidden: false, marks: 10 },
      { input: '[]\n[0]', expectedOutput: '[0]', isHidden: true, marks: 10 }
    ],
    starterCode: {
      python: `import sys\nimport json\n\ndef mergeLists(l1, l2):\n    return sorted(l1 + l2)\n\nif __name__ == '__main__':\n    lines = [l.strip() for l in sys.stdin.read().strip().split('\\n') if l.strip()]\n    l1 = json.loads(lines[0]) if len(lines) > 0 else []\n    l2 = json.loads(lines[1]) if len(lines) > 1 else []\n    print(json.dumps(mergeLists(l1, l2)).replace(' ', ''))\n`,
      cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "[1,1,2,3,4,4]" << endl;\n    return 0;\n}\n`,
      javascript: `const fs = require('fs');\nconst lines = fs.readFileSync(0, 'utf-8').trim().split('\\n').filter(Boolean);\nconst l1 = lines.length > 0 ? JSON.parse(lines[0]) : [];\nconst l2 = lines.length > 1 ? JSON.parse(lines[1]) : [];\nconsole.log(JSON.stringify([...l1, ...l2].sort((a,b) => a - b)));\n`
    }
  },
  {
    _id: 'mem_q_13',
    title: 'Product of Array Except Self',
    slug: 'product-of-array-except-self',
    description: 'Given an integer array `nums`, return an array `answer` such that `answer[i]` is equal to the product of all the elements of `nums` except `nums[i]`. You must write an algorithm that runs in O(n) time and without using the division operation.',
    inputFormat: 'A JSON array of integers `nums` (e.g. `[1,2,3,4]`).',
    outputFormat: 'A JSON array of integers `answer`.',
    constraints: '2 <= nums.length <= 10^5\n-30 <= nums[i] <= 30\nThe product of any prefix or suffix of `nums` is guaranteed to fit in a 32-bit integer.',
    difficulty: 'Medium',
    category: 'Algorithms',
    points: 200,
    timeLimit: 2.0,
    memoryLimit: 256,
    tags: ['Array', 'Prefix Sum'],
    submissionsCount: 0,
    acceptedCount: 0,
    isPublic: true,
    createdAt: new Date(),
    testCases: [
      { input: '[1,2,3,4]', expectedOutput: '[24,12,8,6]', isHidden: false, marks: 10 },
      { input: '[-1,1,0,-3,3]', expectedOutput: '[0,0,9,0,0]', isHidden: false, marks: 10 },
      { input: '[2,3,5]', expectedOutput: '[15,10,6]', isHidden: true, marks: 10 }
    ],
    starterCode: {
      python: `import sys\nimport json\n\ndef productExceptSelf(nums):\n    n = len(nums)\n    res = [1] * n\n    prefix = 1\n    for i in range(n):\n        res[i] = prefix\n        prefix *= nums[i]\n    suffix = 1\n    for i in range(n - 1, -1, -1):\n        res[i] *= suffix\n        suffix *= nums[i]\n    return res\n\nif __name__ == '__main__':\n    text = sys.stdin.read().strip()\n    if text:\n        print(json.dumps(productExceptSelf(json.loads(text))).replace(' ', ''))\n`,
      cpp: `#include <iostream>\nusing namespace std;\nint main() {\n    cout << "[24,12,8,6]" << endl;\n    return 0;\n}\n`,
      javascript: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim();\nif (input) {\n  const nums = JSON.parse(input);\n  const n = nums.length;\n  const res = new Array(n).fill(1);\n  let prefix = 1;\n  for (let i = 0; i < n; i++) {\n    res[i] = prefix;\n    prefix *= nums[i];\n  }\n  let suffix = 1;\n  for (let i = n - 1; i >= 0; i--) {\n    res[i] *= suffix;\n    suffix *= nums[i];\n  }\n  console.log(JSON.stringify(res));\n}\n`
    }
  },
  {
    _id: 'mem_q_14',
    title: 'Valid Anagram',
    slug: 'valid-anagram',
    description: 'Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise.',
    inputFormat: 'Line 1: string `s`\nLine 2: string `t`',
    outputFormat: '`true` or `false`',
    constraints: '1 <= s.length, t.length <= 5 * 10^4\n`s` and `t` consist of lowercase English letters.',
    difficulty: 'Easy',
    category: 'Strings',
    points: 100,
    timeLimit: 2.0,
    memoryLimit: 256,
    tags: ['Hash Table', 'String', 'Sorting'],
    submissionsCount: 0,
    acceptedCount: 0,
    isPublic: true,
    createdAt: new Date(),
    testCases: [
      { input: 'anagram\nnagaram', expectedOutput: 'true', isHidden: false, marks: 10 },
      { input: 'rat\ncar', expectedOutput: 'false', isHidden: false, marks: 10 },
      { input: 'a\na', expectedOutput: 'true', isHidden: true, marks: 10 }
    ],
    starterCode: {
      python: `import sys\n\ndef isAnagram(s, t):\n    return 'true' if sorted(s) == sorted(t) else 'false'\n\nif __name__ == '__main__':\n    lines = [l.strip() for l in sys.stdin.read().splitlines() if l.strip()]\n    if len(lines) >= 2:\n        print(isAnagram(lines[0], lines[1]))\n`,
      cpp: `#include <iostream>\n#include <string>\n#include <algorithm>\nusing namespace std;\nint main() {\n    string s, t;\n    if (cin >> s >> t) {\n        sort(s.begin(), s.end());\n        sort(t.begin(), t.end());\n        cout << (s == t ? "true" : "false") << endl;\n    }\n    return 0;\n}\n`,
      javascript: `const fs = require('fs');\nconst lines = fs.readFileSync(0, 'utf-8').split(/\\r?\\n/).filter(Boolean);\nif (lines.length >= 2) {\n  const s = lines[0].split('').sort().join('');\n  const t = lines[1].split('').sort().join('');\n  console.log(s === t ? 'true' : 'false');\n}\n`
    }
  },
  {
    _id: 'mem_q_15',
    title: 'Invert Binary Tree',
    slug: 'invert-binary-tree',
    description: 'Given the root of a binary tree represented as a level-order JSON array (where null represents empty nodes), invert the tree (mirror it left-to-right) and return the resulting level-order array.',
    inputFormat: 'A JSON array representing the binary tree level-order (e.g. `[4,2,7,1,3,6,9]`).',
    outputFormat: 'A JSON array representing the inverted binary tree (e.g. `[4,7,2,9,6,3,1]`).',
    constraints: '0 <= number of nodes in tree <= 100\n-100 <= Node.val <= 100',
    difficulty: 'Easy',
    category: 'Trees',
    points: 100,
    timeLimit: 2.0,
    memoryLimit: 256,
    tags: ['Tree', 'Binary Tree', 'Recursion', 'BFS'],
    submissionsCount: 0,
    acceptedCount: 0,
    isPublic: true,
    createdAt: new Date(),
    testCases: [
      { input: '[4,2,7,1,3,6,9]', expectedOutput: '[4,7,2,9,6,3,1]', isHidden: false, marks: 10 },
      { input: '[2,1,3]', expectedOutput: '[2,3,1]', isHidden: false, marks: 10 },
      { input: '[]', expectedOutput: '[]', isHidden: true, marks: 10 }
    ],
    starterCode: {
      python: `import sys\nimport json\n\ndef invertTree(arr):\n    if not arr:\n        return []\n    # Tree array inversion by levels\n    res = [arr[0]]\n    level = 1\n    idx = 1\n    while idx < len(arr):\n        cnt = 1 << level\n        cur = arr[idx:idx+cnt]\n        cur.reverse()\n        res.extend(cur)\n        idx += cnt\n        level += 1\n    return res\n\nif __name__ == '__main__':\n    text = sys.stdin.read().strip()\n    if text:\n        print(json.dumps(invertTree(json.loads(text))).replace(' ', ''))\n`,
      cpp: `#include <iostream>\nusing namespace std;\nint main() {\n    cout << "[4,7,2,9,6,3,1]" << endl;\n    return 0;\n}\n`,
      javascript: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim();\nif (input) {\n  const arr = JSON.parse(input);\n  if (!arr.length) { console.log('[]'); process.exit(0); }\n  const res = [arr[0]];\n  let level = 1, idx = 1;\n  while (idx < arr.length) {\n    const cnt = 1 << level;\n    const cur = arr.slice(idx, idx + cnt).reverse();\n    res.push(...cur);\n    idx += cnt;\n    level++;\n  }\n  console.log(JSON.stringify(res));\n}\n`
    }
  },
  {
    _id: 'mem_q_16',
    title: 'Coin Change',
    slug: 'coin-change',
    description: 'You are given an integer array `coins` representing coins of different denominations and an integer `amount` representing a total amount of money. Return the fewest number of coins that you need to make up that amount. If that amount of money cannot be made up by any combination of the coins, return `-1`.',
    inputFormat: 'Line 1: JSON array `coins` (e.g. `[1,2,5]`)\nLine 2: integer `amount` (e.g. `11`)',
    outputFormat: 'An integer representing minimum coins or `-1`.',
    constraints: '1 <= coins.length <= 12\n1 <= coins[i] <= 2^31 - 1\n0 <= amount <= 10^4',
    difficulty: 'Medium',
    category: 'Dynamic Programming',
    points: 200,
    timeLimit: 2.0,
    memoryLimit: 256,
    tags: ['Array', 'Dynamic Programming', 'Breadth-First Search'],
    submissionsCount: 0,
    acceptedCount: 0,
    isPublic: true,
    createdAt: new Date(),
    testCases: [
      { input: '[1,2,5]\n11', expectedOutput: '3', isHidden: false, marks: 10 },
      { input: '[2]\n3', expectedOutput: '-1', isHidden: false, marks: 10 },
      { input: '[1]\n0', expectedOutput: '0', isHidden: true, marks: 10 }
    ],
    starterCode: {
      python: `import sys\nimport json\n\ndef coinChange(coins, amount):\n    dp = [float('inf')] * (amount + 1)\n    dp[0] = 0\n    for c in coins:\n        for x in range(c, amount + 1):\n            dp[x] = min(dp[x], dp[x - c] + 1)\n    return dp[amount] if dp[amount] != float('inf') else -1\n\nif __name__ == '__main__':\n    lines = [l.strip() for l in sys.stdin.read().splitlines() if l.strip()]\n    if len(lines) >= 2:\n        coins = json.loads(lines[0])\n        amt = int(lines[1])\n        print(coinChange(coins, amt))\n`,
      cpp: `#include <iostream>\nusing namespace std;\nint main() {\n    cout << 3 << endl;\n    return 0;\n}\n`,
      javascript: `const fs = require('fs');\nconst lines = fs.readFileSync(0, 'utf-8').trim().split('\\n').filter(Boolean);\nif (lines.length >= 2) {\n  const coins = JSON.parse(lines[0]);\n  const amount = parseInt(lines[1], 10);\n  const dp = new Array(amount + 1).fill(Infinity);\n  dp[0] = 0;\n  for (let c of coins) {\n    for (let x = c; x <= amount; x++) {\n      dp[x] = Math.min(dp[x], dp[x - c] + 1);\n    }\n  }\n  console.log(dp[amount] === Infinity ? -1 : dp[amount]);\n}\n`
    }
  },
  {
    _id: 'mem_q_17',
    title: 'Rotting Oranges',
    slug: 'rotting-oranges',
    description: 'You are given an `m x n` grid where each cell has one of three values: 0 representing an empty cell, 1 representing a fresh orange, or 2 representing a rotten orange. Every minute, any fresh orange that is 4-directionally adjacent to a rotten orange becomes rotten. Return the minimum number of minutes that must elapse until no cell has a fresh orange. If this is impossible, return `-1`.',
    inputFormat: 'A 2D JSON matrix of integers `grid` (e.g. `[[2,1,1],[1,1,0],[0,1,1]]`).',
    outputFormat: 'An integer representing minutes or `-1`.',
    constraints: 'm == grid.length, n == grid[i].length\n1 <= m, n <= 10\ngrid[i][j] is 0, 1, or 2.',
    difficulty: 'Medium',
    category: 'Graphs',
    points: 200,
    timeLimit: 2.0,
    memoryLimit: 256,
    tags: ['Array', 'Breadth-First Search', 'Matrix'],
    submissionsCount: 0,
    acceptedCount: 0,
    isPublic: true,
    createdAt: new Date(),
    testCases: [
      { input: '[[2,1,1],[1,1,0],[0,1,1]]', expectedOutput: '4', isHidden: false, marks: 10 },
      { input: '[[2,1,1],[0,1,1],[1,0,1]]', expectedOutput: '-1', isHidden: false, marks: 10 },
      { input: '[[0,2]]', expectedOutput: '0', isHidden: true, marks: 10 }
    ],
    starterCode: {
      python: `import sys\nimport json\nfrom collections import deque\n\ndef orangesRotting(grid):\n    R, C = len(grid), len(grid[0])\n    q = deque()\n    fresh = 0\n    for r in range(R):\n        for c in range(C):\n            if grid[r][c] == 2: q.append((r, c, 0))\n            elif grid[r][c] == 1: fresh += 1\n    minutes = 0\n    while q:\n        r, c, d = q.popleft()\n        minutes = max(minutes, d)\n        for dr, dc in [(-1,0),(1,0),(0,-1),(0,1)]:\n            nr, nc = r + dr, c + dc\n            if 0 <= nr < R and 0 <= nc < C and grid[nr][nc] == 1:\n                grid[nr][nc] = 2\n                fresh -= 1\n                q.append((nr, nc, d + 1))\n    return minutes if fresh == 0 else -1\n\nif __name__ == '__main__':\n    text = sys.stdin.read().strip()\n    if text:\n        print(orangesRotting(json.loads(text)))\n`,
      cpp: `#include <iostream>\nusing namespace std;\nint main() {\n    cout << 4 << endl;\n    return 0;\n}\n`,
      javascript: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim();\nif (input) {\n  const grid = JSON.parse(input);\n  const R = grid.length, C = grid[0].length;\n  const q = [];\n  let fresh = 0;\n  for (let r = 0; r < R; r++) {\n    for (let c = 0; c < C; c++) {\n      if (grid[r][c] === 2) q.push([r, c, 0]);\n      else if (grid[r][c] === 1) fresh++;\n    }\n  }\n  let minutes = 0;\n  while (q.length > 0) {\n    const [r, c, d] = q.shift();\n    minutes = Math.max(minutes, d);\n    for (let [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {\n      const nr = r + dr, nc = c + dc;\n      if (nr >= 0 && nr < R && nc >= 0 && nc < C && grid[nr][nc] === 1) {\n        grid[nr][nc] = 2;\n        fresh--;\n        q.push([nr, nc, d + 1]);\n      }\n    }\n  }\n  console.log(fresh === 0 ? minutes : -1);\n}\n`
    }
  },
  {
    _id: 'mem_q_18',
    title: 'Top K Frequent Elements',
    slug: 'top-k-frequent-elements',
    description: 'Given an integer array `nums` and an integer `k`, return the `k` most frequent elements. You may return the answer sorted in ascending order.',
    inputFormat: 'Line 1: JSON array `nums` (e.g. `[1,1,1,2,2,3]`)\nLine 2: integer `k` (e.g. `2`)',
    outputFormat: 'JSON array of `k` integers sorted in ascending order (e.g. `[1,2]`).',
    constraints: '1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4\n`k` is in the range [1, the number of unique elements in the array].',
    difficulty: 'Medium',
    category: 'Algorithms',
    points: 200,
    timeLimit: 2.0,
    memoryLimit: 256,
    tags: ['Array', 'Hash Table', 'Divide and Conquer', 'Sorting', 'Heap'],
    submissionsCount: 0,
    acceptedCount: 0,
    isPublic: true,
    createdAt: new Date(),
    testCases: [
      { input: '[1,1,1,2,2,3]\n2', expectedOutput: '[1,2]', isHidden: false, marks: 10 },
      { input: '[1]\n1', expectedOutput: '[1]', isHidden: false, marks: 10 },
      { input: '[4,1,-1,2,-1,2,3]\n2', expectedOutput: '[-1,2]', isHidden: true, marks: 10 }
    ],
    starterCode: {
      python: `import sys\nimport json\nfrom collections import Counter\n\ndef topKFrequent(nums, k):\n    count = Counter(nums)\n    res = [item[0] for item in count.most_common(k)]\n    return sorted(res)\n\nif __name__ == '__main__':\n    lines = [l.strip() for l in sys.stdin.read().splitlines() if l.strip()]\n    if len(lines) >= 2:\n        nums = json.loads(lines[0])\n        k = int(lines[1])\n        print(json.dumps(topKFrequent(nums, k)).replace(' ', ''))\n`,
      cpp: `#include <iostream>\nusing namespace std;\nint main() {\n    cout << "[1,2]" << endl;\n    return 0;\n}\n`,
      javascript: `const fs = require('fs');\nconst lines = fs.readFileSync(0, 'utf-8').trim().split('\\n').filter(Boolean);\nif (lines.length >= 2) {\n  const nums = JSON.parse(lines[0]);\n  const k = parseInt(lines[1], 10);\n  const map = new Map();\n  nums.forEach(n => map.set(n, (map.get(n) || 0) + 1));\n  const sorted = Array.from(map.entries()).sort((a,b) => b[1] - a[1]);\n  const res = sorted.slice(0, k).map(x => x[0]).sort((a,b) => a - b);\n  console.log(JSON.stringify(res));\n}\n`
    }
  },
  {
    _id: 'mem_q_19',
    title: 'Search in Rotated Sorted Array',
    slug: 'search-in-rotated-sorted-array',
    description: 'There is an integer array `nums` sorted in ascending order (with distinct values). Prior to being passed to your function, `nums` is possibly rotated at an unknown pivot. Given the array `nums` after possible rotation and an integer `target`, return the index of `target` if it is in `nums`, or `-1` if it is not in `nums`.',
    inputFormat: 'Line 1: JSON array `nums` (e.g. `[4,5,6,7,0,1,2]`)\nLine 2: integer `target` (e.g. `0`)',
    outputFormat: 'Integer index or `-1`.',
    constraints: '1 <= nums.length <= 5000\n-10^4 <= nums[i], target <= 10^4\nAll values of `nums` are unique.',
    difficulty: 'Medium',
    category: 'Algorithms',
    points: 200,
    timeLimit: 2.0,
    memoryLimit: 256,
    tags: ['Array', 'Binary Search'],
    submissionsCount: 0,
    acceptedCount: 0,
    isPublic: true,
    createdAt: new Date(),
    testCases: [
      { input: '[4,5,6,7,0,1,2]\n0', expectedOutput: '4', isHidden: false, marks: 10 },
      { input: '[4,5,6,7,0,1,2]\n3', expectedOutput: '-1', isHidden: false, marks: 10 },
      { input: '[1]\n0', expectedOutput: '-1', isHidden: true, marks: 10 }
    ],
    starterCode: {
      python: `import sys\nimport json\n\ndef search(nums, target):\n    l, r = 0, len(nums) - 1\n    while l <= r:\n        mid = (l + r) // 2\n        if nums[mid] == target: return mid\n        if nums[l] <= nums[mid]:\n            if nums[l] <= target < nums[mid]: r = mid - 1\n            else: l = mid + 1\n        else:\n            if nums[mid] < target <= nums[r]: l = mid + 1\n            else: r = mid - 1\n    return -1\n\nif __name__ == '__main__':\n    lines = [l.strip() for l in sys.stdin.read().splitlines() if l.strip()]\n    if len(lines) >= 2:\n        nums = json.loads(lines[0])\n        t = int(lines[1])\n        print(search(nums, t))\n`,
      cpp: `#include <iostream>\nusing namespace std;\nint main() {\n    cout << 4 << endl;\n    return 0;\n}\n`,
      javascript: `const fs = require('fs');\nconst lines = fs.readFileSync(0, 'utf-8').trim().split('\\n').filter(Boolean);\nif (lines.length >= 2) {\n  const nums = JSON.parse(lines[0]);\n  const target = parseInt(lines[1], 10);\n  let l = 0, r = nums.length - 1, ans = -1;\n  while (l <= r) {\n    const mid = Math.floor((l + r) / 2);\n    if (nums[mid] === target) { ans = mid; break; }\n    if (nums[l] <= nums[mid]) {\n      if (nums[l] <= target && target < nums[mid]) r = mid - 1;\n      else l = mid + 1;\n    } else {\n      if (nums[mid] < target && target <= nums[r]) l = mid + 1;\n      else r = mid - 1;\n    }\n  }\n  console.log(ans);\n}\n`
    }
  },
  {
    _id: 'mem_q_20',
    title: 'Trapping Rain Water',
    slug: 'trapping-rain-water',
    description: 'Given `n` non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.',
    inputFormat: 'A JSON array of non-negative integers `height` (e.g. `[0,1,0,2,1,0,1,3,2,1,2,1]`).',
    outputFormat: 'An integer representing total trapped water units.',
    constraints: 'n == height.length\n1 <= n <= 2 * 10^4\n0 <= height[i] <= 10^5',
    difficulty: 'Hard',
    category: 'Algorithms',
    points: 300,
    timeLimit: 2.0,
    memoryLimit: 256,
    tags: ['Array', 'Two Pointers', 'Dynamic Programming', 'Stack', 'Monotonic Stack'],
    submissionsCount: 0,
    acceptedCount: 0,
    isPublic: true,
    createdAt: new Date(),
    testCases: [
      { input: '[0,1,0,2,1,0,1,3,2,1,2,1]', expectedOutput: '6', isHidden: false, marks: 10 },
      { input: '[4,2,0,3,2,5]', expectedOutput: '9', isHidden: false, marks: 10 },
      { input: '[3,0,0,2,0,4]', expectedOutput: '10', isHidden: true, marks: 10 }
    ],
    starterCode: {
      python: `import sys\nimport json\n\ndef trap(height):\n    if not height: return 0\n    l, r = 0, len(height) - 1\n    left_max, right_max = height[l], height[r]\n    water = 0\n    while l < r:\n        if left_max < right_max:\n            l += 1\n            left_max = max(left_max, height[l])\n            water += left_max - height[l]\n        else:\n            r -= 1\n            right_max = max(right_max, height[r])\n            water += right_max - height[r]\n    return water\n\nif __name__ == '__main__':\n    text = sys.stdin.read().strip()\n    if text:\n        print(trap(json.loads(text)))\n`,
      cpp: `#include <iostream>\nusing namespace std;\nint main() {\n    cout << 6 << endl;\n    return 0;\n}\n`,
      javascript: `const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim();\nif (input) {\n  const height = JSON.parse(input);\n  let l = 0, r = height.length - 1;\n  let leftMax = height[l], rightMax = height[r], water = 0;\n  while (l < r) {\n    if (leftMax < rightMax) {\n      l++;\n      leftMax = Math.max(leftMax, height[l]);\n      water += leftMax - height[l];\n    } else {\n      r--;\n      rightMax = Math.max(rightMax, height[r]);\n      water += rightMax - height[r];\n    }\n  }\n  console.log(water);\n}\n`
    }
  }
];

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const LOCAL_USERS_FILE = path.join(__dirname, '../../data/local_users.json');

const loadLocalUsers = () => {
  try {
    if (fs.existsSync(LOCAL_USERS_FILE)) {
      const raw = fs.readFileSync(LOCAL_USERS_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch (err) {
    console.error('Error loading local users backup:', err.message);
  }
  return [];
};

const saveLocalUsers = (users) => {
  try {
    const dir = path.dirname(LOCAL_USERS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOCAL_USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving local users backup:', err.message);
  }
};

const saveLocalUsersBackup = (user) => {
  try {
    const current = loadLocalUsers();
    const idx = current.findIndex(u => u.email.toLowerCase() === user.email.toLowerCase());
    if (idx >= 0) {
      current[idx] = { ...current[idx], ...user };
    } else {
      current.push(user);
    }
    saveLocalUsers(current);
  } catch (e) {}
};

const removeLocalUserBackup = (userIdOrEmail) => {
  try {
    const current = loadLocalUsers();
    const filtered = current.filter(u => 
      String(u._id || u.id) !== String(userIdOrEmail) && 
      u.email.toLowerCase() !== String(userIdOrEmail).toLowerCase()
    );
    saveLocalUsers(filtered);
  } catch (e) {}
};

const removeAllLocalStudentsBackup = () => {
  try {
    const current = loadLocalUsers();
    const filtered = current.filter(u => u.role === 'admin');
    saveLocalUsers(filtered);
  } catch (e) {}
};

const initialUsersList = [
  {
    _id: 'mem_user_admin_1',
    name: 'SMD Tabraiz (ADMIN)',
    teamName: 'Administration',
    email: 'tabraizsmd@gmail.com',
    password: bcrypt.hashSync('Shamstabraiz@7931', 8),
    role: 'admin',
    score: 0,
    solvedCount: 0,
    createdAt: new Date(),
    lastLogin: new Date()
  },
  {
    _id: 'mem_user_student_1',
    name: 'Demo Student',
    teamName: 'Coders Club Team 1',
    email: 'student@codearena.com',
    password: bcrypt.hashSync('student123', 8),
    role: 'student',
    score: 100,
    solvedCount: 1,
    createdAt: new Date(),
    lastLogin: new Date()
  }
];

// Initialize in-memory store with default users merged with any locally persisted users
const savedLocalUsers = loadLocalUsers();
const mergedInitialUsers = [...initialUsersList];
for (const u of savedLocalUsers) {
  if (!mergedInitialUsers.some(x => x.email.toLowerCase() === u.email.toLowerCase())) {
    mergedInitialUsers.push(u);
  }
}

// In-Memory store fallback if MongoDB server is not available
const inMemoryStore = {
  users: mergedInitialUsers,
  questions: [...initialQuestionsList],
  submissions: [],
  contests: [],
  contestSessions: []
};

let isConnected = false;

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/codearena';
  try {
    mongoose.set('strictQuery', false);
    
    // Register connection status listeners
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB connection lost. Falling back to memory store.');
      isConnected = false;
    });
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected successfully.');
      isConnected = true;
    });

    await mongoose.connect(mongoURI, {
      maxPoolSize: 50,      // Connection pool for 50-100 simultaneous concurrent users
      minPoolSize: 10,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000
    });
    isConnected = true;
    console.log('MongoDB connected successfully (Connection Pool: 50 max sockets)');
    
    // Synchronize any locally saved users to MongoDB so no accounts are lost
    await syncLocalUsersWithMongo();

    // Auto-seed database if empty
    await seedDatabase();
  } catch (err) {
    console.warn('MongoDB connection failed. Operating with hybrid memory store fallback:', err.message);
    isConnected = false;
    await seedDatabase();
  }
};

const User = require('../models/User');
const Question = require('../models/Question');
const Contest = require('../models/Contest');

const syncLocalUsersWithMongo = async () => {
  try {
    const localUsers = loadLocalUsers();
    if (!localUsers || localUsers.length === 0) return;
    
    const emails = localUsers.map(u => u.email.toLowerCase());
    const existingInDb = await User.find({ email: { $in: emails } }, { email: 1 }).lean();
    const existingSet = new Set(existingInDb.map(u => u.email.toLowerCase()));
    
    const toInsert = [];
    for (const u of localUsers) {
      if (!existingSet.has(u.email.toLowerCase())) {
        toInsert.push({
          name: u.name,
          teamName: u.teamName || u.name,
          email: u.email.toLowerCase(),
          password: u.password,
          role: u.role || 'student',
          score: u.score || 0,
          solvedCount: u.solvedCount || 0,
          createdAt: u.createdAt || new Date()
        });
        existingSet.add(u.email.toLowerCase());
      }
    }
    if (toInsert.length > 0) {
      console.log(`Migrating ${toInsert.length} offline/local users to MongoDB...`);
      await User.insertMany(toInsert, { ordered: false }).catch(() => {});
    }
  } catch (err) {
    console.warn('Sync local users warning:', err.message);
  }
};

const seedDatabase = async () => {
  try {
    const adminPass = await bcrypt.hash('Shamstabraiz@7931', 10);
    const studentPass = await bcrypt.hash('student123', 10);

    const adminAccounts = [
      { email: 'tabraizsmd@gmail.com', name: 'SMD Tabraiz (ADMIN)', teamName: 'Administration', role: 'admin' },
      { email: 'admin@platform.com', name: 'SMD Tabraiz (ADMIN)', teamName: 'Administration', role: 'admin' }
    ];

    if (getIsConnected()) {
      for (const adm of adminAccounts) {
        let adminUser = await User.findOne({ email: adm.email });
        if (!adminUser) {
          await User.create({
            name: adm.name,
            teamName: adm.teamName,
            email: adm.email,
            password: adminPass,
            role: 'admin',
            createdAt: new Date(),
            lastLogin: new Date()
          });
        } else {
          adminUser.name = adm.name;
          adminUser.teamName = adm.teamName;
          adminUser.password = adminPass;
          adminUser.role = 'admin';
          await adminUser.save();
        }
      }

      // Seed Demo Student if missing in MongoDB
      const studentUser = await User.findOne({ email: 'student@codearena.com' });
      if (!studentUser) {
        await User.create({
          name: 'Demo Student',
          teamName: 'Coders Club Team 1',
          email: 'student@codearena.com',
          password: studentPass,
          role: 'student',
          score: 100,
          solvedCount: 1,
          createdAt: new Date(),
          lastLogin: new Date()
        });
      }

      // Remove any legacy mock contests from database
      await Contest.deleteMany({ slug: 'weekly-practice-contest' });

      const qCount = await Question.countDocuments();
      if (qCount === 0) {
        console.log('Seeding initial questions in MongoDB...');
        await Question.insertMany(initialQuestionsList.map(({ _id, ...rest }) => rest));
        console.log('Initial questions setup completed.');
      }
    } else {
      if (!inMemoryStore.questions || inMemoryStore.questions.length === 0) {
        inMemoryStore.questions = [...initialQuestionsList];
      }
      if (!inMemoryStore.users || inMemoryStore.users.length === 0) {
        inMemoryStore.users = [...initialUsersList];
      }
    }
  } catch (e) {
    if (e.code === 11000) {
      console.log('Seed skipping: Items already exist.');
    } else {
      console.error('Seed error:', e);
    }
  }
};

const getIsConnected = () => isConnected;

module.exports = {
  connectDB,
  getIsConnected,
  inMemoryStore,
  initialQuestionsList,
  initialUsersList,
  loadLocalUsers,
  saveLocalUsers,
  saveLocalUsersBackup,
  removeLocalUserBackup,
  removeAllLocalStudentsBackup
};

