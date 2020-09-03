const path = require('path');
const fs = require('fs')  // node中读取文件的系统
const jwt = require('jsonwebtoken');  
const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, 'db.json')); // 绝对路径
const middlewares = jsonServer.defaults();
server.use(jsonServer.bodyParser);
server.use(middlewares);

// 读取users.json中的用户数据，获取到的是json格式，用JSON.parse转换为对象
const getUsersDB = () => {
    return JSON.parse(
        fs.readFileSync(path.join(__dirname, 'users.json'), 'utf-8')  // 绝对路径写法
    );
};

// 查找数据库中是否有该email和passw组合
// 传对象做为参数的话，切记对象的属性名称要一致
const isAuthenticated = ({ email, password }) => {   
    return (
        // findIndex函数，找到会返回列表中的index，找不到返回-1
        getUsersDB().users.findIndex(
            (user) => user.email === email && user.password === password
        ) !== -1
    );
}

// 查看该email是否已注册
const isSigned = (email) => {
    return (
        getUsersDB().users.findIndex(
            (user) => user.email === email
        ) !== -1
    )
}

// jwt需要注册，这是一个注册函数，payload就是真实数据
const SECRET = '123asd3eraadfskle423a';  // 密钥自定，随便写
const expiresIn = '1h'  // 设置失效时间1小时
const createToken = (payload) => {
    return jwt.sign(payload, SECRET, { expiresIn })
}

server.post('/auth/signup', (req, res) => {
    const { email, password, nickname, type } = req.body;

    // 1. 查看该email是否已注册
    if (isSigned(email)) {
        const status = 401;
        const message = 'Email and password already exist.';
        return res.status(status).json({ status, message });
    }

    // 2. 数据写入users.json，相当于写入数据库
    fs.readFile(path.join(__dirname, 'users.json'), (err, _data) => {
        if (err) {
            const status = 401;
            const message = err;
            return res.status(status).json({ status, message })
        }
        // 解析json获取当前数据，返回一个列表
        const data = JSON.parse(_data.toString());
        // 获取最后一个id
        const last_item_id = data.users[data.users.length -1].id
        // 给列表新增
        data.users.push({ id: last_item_id + 1, email, password, nickname, type });
        // 列表写会users.json
        fs.writeFile(
            path.join(__dirname, 'users.json'),
            JSON.stringify(data),
            (err, result) => {
                if (err) {
                    const status = 401;
                    const message = err;
                    res.status(status).json({ status, message })
                    return;
                }
            }
        );
        // 成功以后给新用户返回新jwt
        const jwToken = createToken({ nickname, type, email });
        res.status(200).json(jwToken);
    })
})

server.post('/auth/login', (req, res) => {
    const { email, password } = req.body;

    // 检验提交的账号密码是否正确，正确的话返回jwt，否则返回错误
    if (isAuthenticated( { email, password } )) {
        const user = getUsersDB().users.find(
            u => u.email === email && u.password === password
        );  
        const { nickname, type } = user;
        // json-web-token
        const jwToken = createToken({ nickname, type, email });
        return res.status(200).json(jwToken);
    } else {
        return res.status(401).json('Invalid email or password.');
    }
})


server.use(router);
server.listen(8000, () => {
  console.log('JSON Server is running')
});

