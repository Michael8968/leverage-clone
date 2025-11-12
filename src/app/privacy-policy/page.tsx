import { AppLayout } from '@/components/app-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
    return (
        <div className="bg-background min-h-screen video-foreground">
            <div className="container mx-auto py-8 md:py-12">
                <Card className="max-w-4xl mx-auto">
                    <CardHeader className="text-center">
                        <CardTitle className="font-headline text-3xl">问视间平台隐私政策</CardTitle>
                        <CardDescription>生效日期：2025年9月24日</CardDescription>
                    </CardHeader>
                    <CardContent className="prose prose-sm md:prose-base max-w-none dark:prose-invert">
                        <p>问视间（上海）科技有限公司（以下简称“本公司”或“平台方”）重视您的隐私权，但本《问视间平台隐私政策》（以下简称“本政策”）旨在明确平台方收集、使用、处理个人信息的权利，以确保服务顺利提供。请仔细阅读本政策。一旦您注册、登录或使用平台，即表示您无条件同意本政策的所有条款，包括个人信息授权和分享。</p>
                        <p>本政策适用于所有用户，包括供应商、创意师、普通用户。平台方有权根据需要更新本政策，用户继续使用即视为同意。</p>

                        <h3>第一条 个人信息收集</h3>
                        <ol>
                            <li>我们收集的信息包括但不限于：
                                <ul>
                                    <li><strong>注册信息：</strong>姓名/名称、联系方式、身份证明、地址、财务信息。</li>
                                    <li><strong>使用信息：</strong>浏览记录、提示词、生成内容、交易数据、行为日志。</li>
                                    <li><strong>设备信息：</strong>IP地址、设备ID、位置数据、cookie数据。</li>
                                </ul>
                            </li>
                            <li>平台方有权在必要时收集上述信息，用于服务提供、风险防控、AI优化等，且用户无权限制或拒绝，除非停止使用平台。</li>
                        </ol>

                        <h3>第二条 个人信息使用</h3>
                        <ol>
                            <li>使用目的包括但不限于：账户管理、服务提供、AI匹配、个性化推荐、营销推送、数据分析、法律合规、平台安全。</li>
                            <li>平台方使用 cookie、追踪技术等监控用户行为，以提升平台功能。用户同意此类使用，且无权要求删除追踪数据。</li>
                        </ol>

                        <h3>第三条 个人信息分享与授权</h3>
                        <ol>
                            <li>平台方不会出售个人信息，但有权在以下情形分享：
                                <ul>
                                    <li>与合作机构（如支付、物流、AI供应商、广告伙伴）分享必要信息，用于服务履行、联合营销、数据共享。</li>
                                    <li>经法律要求或平台方判断必要，向政府部门、监管机构披露。</li>
                                    <li>与关联公司分享，用于内部运营。</li>
                                </ul>
                            </li>
                            <li><strong>授权条款：</strong>用户无条件授权本公司收集、使用、存储、处理其个人信息，并在必要时与合作机构之间传递个人信息，包括但不限于姓名、联系方式、交易数据、生成内容。该授权为全球、永久、不可撤销，用于服务提供、匹配优化、商业合作、AI训练等。用户同意个人信息可能跨境传输，且承担相关风险。用户可随时撤回授权，但平台方有权继续使用已收集信息，且撤回可能导致服务终止。平台方不对分享导致的任何后果负责。</li>
                        </ol>

                        <h3>第四条 个人信息保护</h3>
                        <ol>
                            <li>平台方采取合理措施（如加密、访问控制）保护信息，但不对黑客攻击、用户泄露等导致的泄露负责。若发生泄露，平台方仅在法律要求时通知用户。</li>
                            <li>信息存储在中国境内或境外服务器，保留期为服务必要期间、法律要求或平台方决定期间。用户无权要求提前删除，除非法律强制。</li>
                            <li>平台方有权匿名化、聚合个人信息用于研究、统计，而用户无权主张权利。</li>
                        </ol>

                        <h3>第五条 用户权利</h3>
                        <ol>
                            <li>用户可通过平台客服访问、更正部分个人信息，但平台方有权审核并决定是否执行。删除请求仅限于非必要信息，且不影响平台已使用数据。</li>
                            <li>联系方式：privacy@wenshijian.com。平台方响应时间以内部安排为准，用户无权要求即时响应。</li>
                        </ol>

                        <h3>第六条 儿童隐私</h3>
                        <p>我们不针对14周岁以下儿童提供服务。若发现儿童信息，平台方有权删除并报告监护人。</p>

                        <h3>第七条 更新与适用法律</h3>
                        <ol>
                            <li>本政策可由平台方随时更新，通过平台公告。继续使用即视为同意，用户无权拒绝。</li>
                            <li>适用中华人民共和国法律，特别是《个人信息保护法》，但以有利于平台方的解释为准。争议提交上海市仲裁委员会。</li>
                        </ol>

                        <p className="font-bold">用户注册即表示无条件同意本政策，并授权个人信息处理。平台方享有最大化权利保护自身利益。</p>
                        <p className="font-bold text-right">问视间（上海）科技有限公司</p>

                        <div className="text-center mt-8">
                            <Link href="/register" className="text-primary hover:underline">返回注册页面</Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
