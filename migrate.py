import re
import sys

def migrate_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # 1. Make all route handlers async
    # Replace: app.get('/api/...', (req, res) => {
    # With: app.get('/api/...', async (req, res) => {
    content = re.sub(r'(app\.(get|post|put|delete|patch)\([\'`"].+?[\'`],\s*)(?:\((?:req,\s*res.*?)\)|req,\s*res)\s*=>\s*\{', r'\1async (req, res) => {', content)
    
    # Also handle authenticateToken middleware wrappers if any inside routes
    content = re.sub(r'(\(req,\s*res(?:,\s*next)?\)\s*=>\s*\{)', r'async \1', content)
    # Fix double async
    content = content.replace('async async', 'async')

    # 2. Replace db.prepare(...).get(...)
    # This is tricky because it might be chained or assigned.
    # Pattern: const user = db.prepare('SELECT ...').get(args);
    # To: const user = await db.querySingle('SELECT ...', [args]);
    
    # We'll use a simpler approach for db.prepare(...).get(...)
    # We find db.prepare(SQL).get(ARGS)
    def replacer_get(match):
        sql = match.group(1)
        args = match.group(2)
        if args:
            return f"await db.querySingle({sql}, [{args}])"
        else:
            return f"await db.querySingle({sql})"
            
    content = re.sub(r'db\.prepare\((.*?)\)\.get\((.*?)\)', replacer_get, content)
    
    # 3. Replace db.prepare(...).all(...)
    def replacer_all(match):
        sql = match.group(1)
        args = match.group(2)
        if args:
            return f"(await db.query({sql}, [{args}]))[0]"
        else:
            return f"(await db.query({sql}))[0]"
            
    content = re.sub(r'db\.prepare\((.*?)\)\.all\((.*?)\)', replacer_all, content)
    
    # 4. Replace db.prepare(...).run(...)
    def replacer_run(match):
        sql = match.group(1)
        args = match.group(2)
        if args:
            return f"await db.query({sql}, [{args}])"
        else:
            return f"await db.query({sql})"
            
    content = re.sub(r'db\.prepare\((.*?)\)\.run\((.*?)\)', replacer_run, content)
    
    # 5. Fix lastInsertRowid
    # In sqlite: const result = db.prepare('INSERT').run(); result.lastInsertRowid
    # In mysql2: const [result] = await db.query('INSERT'); result.insertId
    # So if we see `.lastInsertRowid`, we change it to `.insertId`
    content = content.replace('.lastInsertRowid', '.insertId')
    content = content.replace('.changes', '.affectedRows')

    with open(filepath, 'w') as f:
        f.write(content)
    
    print("Migration script completed.")

if __name__ == '__main__':
    migrate_file('server/index.js')
