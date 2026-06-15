with open('server/index.js', 'r') as f:
    content = f.read()

content = content.replace('function await getSetting', 'function getSetting')
content = content.replace('async function getSetting', 'async function getSetting')

with open('server/index.js', 'w') as f:
    f.write(content)
