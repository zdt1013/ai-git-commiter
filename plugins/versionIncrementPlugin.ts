import fs from 'fs';
import path from 'path';
import { PluginOption } from 'vite';

interface VersionIncrementOptions {
    env?: string[]; // 指定需要自增的环境
    mode?: string; // 当前模式
}

/**
 * 版本自增插件
**/
export default function versionIncrementPlugin(options: VersionIncrementOptions = {}): PluginOption {
    return {
        name: 'version-increment',  // 插件名称
        apply: 'build',  // 只在构建时应用
        buildStart() {
            // 获取当前Vite的--mode参数，默认为development
            const currentMode = options.mode || 'development';

            // 检查当前环境是否在指定的自增环境中
            // 如果options.env有值且不包含当前环境，则跳过版本自增
            if (options.env && !options.env.includes(currentMode)) {
                return;
            }

            // 读取package.json文件
            const packagePath = path.resolve(process.cwd(), 'package.json');
            const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));

            // 将版本号按点分割并转换为数字
            // 支持格式：major.minor.patch (99.99.999)
            const [major, minor, patch] = pkg.version.split('.').map(Number);
            let newMajor = major;
            let newMinor = minor;
            let newPatch = patch + 1;  // 默认补丁号+1

            // 版本号进位逻辑：
            // 1. 当补丁号超过999时，归零并增加次版本号
            // 2. 当次版本号超过99时，归零并增加主版本号
            if (newPatch > 999) {
                newPatch = 0;
                newMinor += 1;
                if (newMinor > 99) {
                    newMinor = 0;
                    newMajor += 1;
                }
            }

            // 版本号格式校验
            // 确保主版本号、次版本号不超过99，补丁号不超过999
            if (major > 99 || minor > 99 || patch > 999) {
                throw new Error("版本号超出预设范围(99.99.999)");
            }

            // 更新版本号并写回package.json文件
            pkg.version = `${newMajor}.${newMinor}.${newPatch}`;
            fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2));  // 保持2空格缩进格式
        }
    };
}
