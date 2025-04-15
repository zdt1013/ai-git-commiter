import fs from 'fs';
import path from 'path';
import { PluginOption } from 'vite';

interface VersionIncrementOptions {
    env?: string[]; // 指定需要自增的环境
}

export default function versionIncrementPlugin(options: VersionIncrementOptions = {}): PluginOption {
    return {
        name: 'version-increment',
        apply: 'build',
        buildStart() {
            // 获取当前环境，默认为development
            const currentEnv = process.env.NODE_ENV || 'development';

            // 如果指定了环境且当前环境不在指定列表中，则不执行自增
            if (options.env && !options.env.includes(currentEnv)) {
                return;
            }

            const packagePath = path.resolve(process.cwd(), 'package.json');
            const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));

            // 版本号分割（支持99.99.999格式）
            const [major, minor, patch] = pkg.version.split('.').map(Number);
            let newMajor = major;
            let newMinor = minor;
            let newPatch = patch + 1;

            // 进位逻辑（补丁号到999进位次版本）
            if (newPatch > 999) {
                newPatch = 0;
                newMinor += 1;
                if (newMinor > 99) {
                    newMinor = 0;
                    newMajor += 1;
                }
            }

            // 版本号格式校验
            if (major > 99 || minor > 99 || patch > 999) {
                throw new Error("版本号超出预设范围(99.99.999)");
            }

            // 更新并写入文件
            pkg.version = `${newMajor}.${newMinor}.${newPatch}`;
            fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2));
        }
    };
}
