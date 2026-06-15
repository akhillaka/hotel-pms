import re

with open('server/index.js', 'r') as f:
    content = f.read()

# Make getSetting async and add await to calls
content = re.sub(r'(?<!await\s)getSetting\(', r'await getSetting(', content)
content = content.replace('function await getSetting(key)', 'async function getSetting(key)')
content = content.replace('async function await getSetting(key)', 'async function getSetting(key)')

def extract_args(text):
    # This might match the arguments passed to get/all/run.
    text = text.strip()
    if text:
        return f"[{text}]"
    return ""

# Match db.prepare(...).get(...)
# We have to be careful with nested parentheses in the args.
# A regex like `db\.prepare\((.*?)\)\.get\((.*?)\)` with DOTALL is dangerous because of non-greediness missing trailing parentheses.
# Let's use a simpler approach: process line by line, but if there's a backtick, we might need to handle multiline.

