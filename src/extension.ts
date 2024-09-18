import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import open from 'open';
let currentLanguage = '';
let data: any[] = [];
export function activate(context: vscode.ExtensionContext) {
	const defaultLanguage = currentLanguage || vscode.env.language;
	loadLanguageData(context, defaultLanguage);
	const treeDataProvider = new VueTreeDataProvider();
	const treeView = vscode.window.createTreeView('vueView', { treeDataProvider });
	treeView.onDidChangeVisibility((e) => {
		if (e.visible) {
			openHtmlPage(context);
		}
	});
	vscode.commands.registerCommand('vueView.openLink', (link: string) => {
		const panel = vscode.window.createWebviewPanel(
			'vueView',
			'Vue',
			vscode.ViewColumn.Beside,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
			}
		);
		panel.webview.html = `<iframe src="${link}" style="width:100%; height:100vh;"></iframe>`;
		open(link);
	});
	vscode.commands.registerCommand('vueView.switchLanguage', () => {
		vscode.window.showQuickPick(['en', 'zh'], {
			placeHolder: 'Select language (en/zh)',
		}).then(selectedLanguage => {
			if (selectedLanguage) {
				loadLanguageData(context, selectedLanguage);
				treeDataProvider.refresh();
			}
		});
	});
}
export function deactivate() { }
function loadLanguageData(context: vscode.ExtensionContext, language: string) {
	const lang = language.split('-')[0] || 'en';
	const dataFileName = `data.${lang}.json`;
	const dataPath = path.join(__dirname, dataFileName);
	try {
		data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
		currentLanguage = language;
	} catch (error: any) {
		vscode.window.showErrorMessage(`Failed to load ${dataFileName}: ${error.message}`);
	}
}
function openHtmlPage(context: vscode.ExtensionContext) {
	const panel = vscode.window.createWebviewPanel(
		'vueDataView',
		'Vue.js Resources',
		vscode.ViewColumn.One,
		{
			enableScripts: true,
			retainContextWhenHidden: true,
		}
	);
	panel.webview.html = getHtmlContent();
}
function getHtmlContent() {
	let content = '';
	data.forEach(category => {
		content += `<h2>${category.title}</h2>`;
		category.children.forEach(subCategory => {
			content += `<h3>${subCategory.title}</h3><ul>`;
			subCategory.children.forEach(item => {
				content += `<li><a href="${item.link}" target="_blank">${item.title}</a>`;
				if (item.description) {
					content += ` - ${item.description}`;
				}
				content += `</li>`;
			});
			content += `</ul>`;
		});
	});
	return `
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Vue.js Resources</title>
			<style>
				body {
					font-family: Arial, sans-serif;
					margin: 20px;
					color: #333;
					background-color: #f9f9f9;
				}
				h2 {
					color: #42b983;
				}
				h3 {
					color: #35495e;
					margin-top: 15px;
				}
				ul {
					list-style-type: none;
					padding: 0;
				}
				li {
					margin: 5px 0;
					padding: 8px;
					background-color: #fff;
					border: 1px solid #ddd;
					border-radius: 5px;
				}
				a {
					text-decoration: none;
					color: #42b983;
				}
				a:hover {
					text-decoration: underline;
				}
			</style>
		</head>
		<body>
			<h1>Vue.js Resources</h1>
			${content}
		</body>
		</html>
	`;
}
class VueTreeDataProvider implements vscode.TreeDataProvider<TreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | void> = new vscode.EventEmitter<TreeItem | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | void> = this._onDidChangeTreeData.event;
	getTreeItem(element: TreeItem): vscode.TreeItem {
		return element;
	}
	getChildren(element?: TreeItem): TreeItem[] {
		if (!element) {
			return data.map(item => new TreeItem(item.title, item.link, item.children));
		}
		if (element.children) {
			return element.children.map(child => new TreeItem(child.title, child.link, child.children));
		}
		return [];
	}
	refresh(): void {
		this._onDidChangeTreeData.fire();
	}
}
class TreeItem extends vscode.TreeItem {
	children?: any[];
	link?: string;
	constructor(label: string, link: string, children?: any[]) {
		super(
			label,
			children ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
		);
		this.children = children;
		this.link = link;
		if (link) {
			this.command = {
				command: 'vueView.openLink',
				title: 'Open Link',
				arguments: [link]
			};
		}
		if (this.link) {
			this.iconPath = new vscode.ThemeIcon('link-external');
		}
	}
}
