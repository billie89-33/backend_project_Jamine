import chalk from 'chalk';

const errorHandler = (err, req, res, next) => {
    // กำหนดค่าเริ่มต้นของ Status Code
    const statusCode = err.status || 500;
    
    // 🐞 [Terminal Bug Report] พิมพ์บัคลง Terminal แบบละเอียดพร้อมสีสันเฉพาะตอน Dev
    if (process.env.NODE_ENV !== 'production') {
        console.log('\n' + chalk.bgRed.white.bold(' ❌ BUG REPORT ') + ' ' + chalk.red.bold(`Status: ${statusCode}`));
        console.log(chalk.yellow.bold('Method: ') + chalk.white(req.method) + ' ' + chalk.yellow.bold('URL: ') + chalk.white(req.originalUrl));
        console.log(chalk.red.bold('Message: ') + chalk.white(err.message));
        
        if (err.stack) {
            console.log(chalk.gray('--------------------------------------------------'));
            console.log(chalk.gray(err.stack));
            console.log(chalk.gray('--------------------------------------------------\n'));
        }
    }

    res.status(statusCode).json({
        success: false,
        message: err.message || 'Internal Server Error',
        // แสดง stack trace ใน JSON เฉพาะตอนพัฒนา
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};

export default errorHandler;
