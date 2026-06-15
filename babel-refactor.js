import fs from 'fs';
import parser from '@babel/parser';
import _traverse from '@babel/traverse';
const traverse = _traverse.default;
import _generate from '@babel/generator';
const generate = _generate.default;
import * as t from '@babel/types';

const code = fs.readFileSync('server/index.js', 'utf8');

const ast = parser.parse(code, {
  sourceType: 'module',
  plugins: []
});

let isExpressRoute = (node) => {
  return t.isCallExpression(node) &&
    t.isMemberExpression(node.callee) &&
    t.isIdentifier(node.callee.object, { name: 'app' }) &&
    ['get', 'post', 'put', 'delete'].includes(node.callee.property.name);
};

traverse(ast, {
  // 1. Make getSetting async and add await to its calls.
  FunctionDeclaration(path) {
    if (path.node.id && path.node.id.name === 'getSetting') {
      path.node.async = true;
    }
  },
  CallExpression(path) {
    if (t.isIdentifier(path.node.callee, { name: 'getSetting' })) {
      // If it's already awaited, don't double await
      if (!t.isAwaitExpression(path.parent)) {
        path.replaceWith(t.awaitExpression(path.node));
        // We must ensure enclosing function is async
        let parentFunc = path.getFunctionParent();
        if (parentFunc) {
          parentFunc.node.async = true;
        }
      }
    }
    
    // Express routes async
    if (isExpressRoute(path.node)) {
      let args = path.node.arguments;
      let lastArg = args[args.length - 1];
      if (t.isFunctionExpression(lastArg) || t.isArrowFunctionExpression(lastArg)) {
        lastArg.async = true;
      }
    }

    // Replace db.prepare(SQL).get(params) -> await db.querySingle(SQL, params ? [params] : [])
    // Replace db.prepare(SQL).all(params) -> (await db.query(SQL, params ? [params] : []))[0]
    // Replace db.prepare(SQL).run(params) -> await db.query(SQL, params ? [params] : [])
    
    if (t.isMemberExpression(path.node.callee)) {
      let propName = path.node.callee.property.name;
      if (['get', 'all', 'run'].includes(propName)) {
        let object = path.node.callee.object;
        if (t.isCallExpression(object) && t.isMemberExpression(object.callee)) {
          if (t.isIdentifier(object.callee.object, { name: 'db' }) && t.isIdentifier(object.callee.property, { name: 'prepare' })) {
            let sqlArg = object.arguments[0];
            let methodArgs = path.node.arguments;
            
            // Build query params array
            let queryParams = [];
            if (methodArgs.length > 0) {
              // Sometimes args are already an array, e.g. .run([1, 2]). But in better-sqlite3, you pass args directly like .run(1, 2)
              queryParams = [t.arrayExpression(methodArgs)];
            } else {
              queryParams = [];
            }
            
            let queryArgs = [sqlArg, ...queryParams];
            
            let newCall;
            if (propName === 'get') {
              newCall = t.awaitExpression(t.callExpression(
                t.memberExpression(t.identifier('db'), t.identifier('querySingle')),
                queryArgs
              ));
            } else if (propName === 'run') {
              newCall = t.awaitExpression(t.callExpression(
                t.memberExpression(t.identifier('db'), t.identifier('query')),
                queryArgs
              ));
            } else if (propName === 'all') {
              newCall = t.memberExpression(
                t.awaitExpression(t.callExpression(
                  t.memberExpression(t.identifier('db'), t.identifier('query')),
                  queryArgs
                )),
                t.numericLiteral(0),
                true
              );
            }
            
            path.replaceWith(newCall);
            
            let parentFunc = path.getFunctionParent();
            if (parentFunc) {
              parentFunc.node.async = true;
            }
          }
        }
      }
    }
  }
});

traverse(ast, {
  // Also handle variables that hold prepared statements and then call .run()
  CallExpression(path) {
    if (t.isMemberExpression(path.node.callee)) {
      let propName = path.node.callee.property.name;
      if (['run', 'get', 'all'].includes(propName)) {
        let objectName = path.node.callee.object.name;
        // See if it's a known stmt
        let binding = path.scope.getBinding(objectName);
        if (binding && binding.path.isVariableDeclarator()) {
          let init = binding.path.node.init;
          if (t.isCallExpression(init) && t.isMemberExpression(init.callee) && 
              t.isIdentifier(init.callee.object, { name: 'db' }) && 
              t.isIdentifier(init.callee.property, { name: 'prepare' })) {
            
            let sqlArg = init.arguments[0];
            let methodArgs = path.node.arguments;
            let queryParams = methodArgs.length > 0 ? [t.arrayExpression(methodArgs)] : [];
            let queryArgs = [sqlArg, ...queryParams];
            
            let newCall;
            if (propName === 'get') {
              newCall = t.awaitExpression(t.callExpression(
                t.memberExpression(t.identifier('db'), t.identifier('querySingle')),
                queryArgs
              ));
            } else if (propName === 'run') {
              newCall = t.awaitExpression(t.callExpression(
                t.memberExpression(t.identifier('db'), t.identifier('query')),
                queryArgs
              ));
            } else if (propName === 'all') {
              newCall = t.memberExpression(
                t.awaitExpression(t.callExpression(
                  t.memberExpression(t.identifier('db'), t.identifier('query')),
                  queryArgs
                )),
                t.numericLiteral(0),
                true
              );
            }
            
            path.replaceWith(newCall);
            
            let parentFunc = path.getFunctionParent();
            if (parentFunc) {
              parentFunc.node.async = true;
            }
          }
        }
      }
    }
  }
});

// One more pass to fix transaction to be await db.transaction(async (connection) => { ... })
// Also replace db.prepare with connection.query inside transaction? The instructions say:
// "Inside the transaction, you MUST use connection.query and connection.querySingle."
// Actually it's easier to manually fix the 2 transactions. They are small.

const output = generate(ast, {}, code);
fs.writeFileSync('server/index.js', output.code);
