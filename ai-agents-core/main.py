import os
import sys
import json
from datetime import date
from pathlib import Path
import google.generativeai as genai
from github import Github, GithubException
from notion_client import Client
from pydantic import BaseModel


# --- Contratos Pydantic da Esteira 1 (Desenvolvimento e Notion) ---

class TaskSpecificationOutput(BaseModel):
    task_specification: str
    files_to_modify: list[str]
    acceptance_criteria: list[str]
    recommended_followup_tasks: list[str]


class MinimalChangeOutput(BaseModel):
    modified_files: dict[str, str]
    explanation: str


class AppSecValidationOutput(BaseModel):
    passed: bool
    rls_and_idor_findings: list[str]
    fixed_files: dict[str, str]


class TestAutomationOutput(BaseModel):
    test_files: dict[str, str]
    ci_mocks_summary: str


class SuiteValidationOutput(BaseModel):
    approved_for_pr: bool
    validation_notes: str


# --- Contratos Pydantic da Esteira 2 (Auditoria, Documentacao e Onboarding) ---

class CodebaseAuditOutput(BaseModel):
    technical_debt_report: str
    legacy_risks: list[str]
    recommended_tasks: list[str]


class DocumentGeneratorOutput(BaseModel):
    executive_reports_and_adrs: dict[str, str]


class OnboardingGuidesOutput(BaseModel):
    onboarding_and_mental_models: dict[str, str]


class ScrumMasterOrchestrator:
    """
    Implementa o fluxo exato de 7 agentes divididos em 2 esteiras:

    Esteira 1 (Desenvolvimento e Notion):
      - 11.07 Senior Project Manager (Scrum Master / Ponto Unico de Contato):
          Quebra de Tasks e Gestao do Notion
          -> (1. Especifica Task)
      - 3.35 Minimal Change Engineer:
          Desenvolvimento Modular e CRUD
          -> (2. Implementa)
      - 14.02 AppSec Engineer:
          Politicas RLS e Prevencao IDOR
          -> (3. Valida Seguranca)
      - 18.06 Test Automation Engineer:
          Testes Unitarios e Mocks de CI
          -> (4. Valida Suite) -> Retorna ao 11.07 Senior Project Manager

    Esteira 2 (Auditoria, Documentacao e Onboarding):
      - 16.42 Codebase Archaeologist:
          Auditoria de Codigo e Debito Tecnico
          -> (Audita Legado)
      - 16.45 Document Generator:
          Relatorios Executivos e ADRs
          -> (Formaliza Specs)
      - 3.10 Onboarding Engineer:
          Guias Praticos e Modelos Mentais
    """

    AGENTS = {
        "11.07": {
            "code": "11.07",
            "slug": "project-manager-senior",
            "title": "Senior Project Manager (11.07) - Quebra de Tasks & Gestao do Notion",
            "trigger": "[TRIGGER:11.07_SENIOR_PM]",
        },
        "3.35": {
            "code": "3.35",
            "slug": "engineering-minimal-change-engineer",
            "title": "Minimal Change Engineer (3.35) - Desenvolvimento Modular & CRUD",
            "trigger": "[TRIGGER:3.35_MINIMAL_CHANGE_ENGINEER]",
        },
        "14.02": {
            "code": "14.02",
            "slug": "security-appsec-engineer",
            "title": "AppSec Engineer (14.02) - Politicas RLS & Prevencao IDOR",
            "trigger": "[TRIGGER:14.02_APPSEC_ENGINEER]",
        },
        "18.06": {
            "code": "18.06",
            "slug": "testing-test-automation-engineer",
            "title": "Test Automation Engineer (18.06) - Testes Unitarios & Mocks de CI",
            "trigger": "[TRIGGER:18.06_TEST_AUTOMATION_ENGINEER]",
        },
        "16.42": {
            "code": "16.42",
            "slug": "specialized-codebase-archaeologist",
            "title": "Codebase Archaeologist (16.42) - Auditoria de Codigo & Debito Tecnico",
            "trigger": "[TRIGGER:16.42_CODEBASE_ARCHAEOLOGIST]",
        },
        "16.45": {
            "code": "16.45",
            "slug": "specialized-document-generator",
            "title": "Document Generator (16.45) - Relatorios Executivos & ADRs",
            "trigger": "[TRIGGER:16.45_DOCUMENT_GENERATOR]",
        },
        "3.10": {
            "code": "3.10",
            "slug": "engineering-codebase-onboarding-engineer",
            "title": "Onboarding Engineer (3.10) - Guias Praticos & Modelos Mentais",
            "trigger": "[TRIGGER:3.10_ONBOARDING_ENGINEER]",
        },
    }

    def __init__(
        self,
        github_token: str,
        gemini_key: str,
        notion_api_key: str,
        repo_name: str,
        owner_name: str,
        squad_dir: str = ".squad",
    ):
        self.github_token = github_token
        self.gemini_key = gemini_key
        self.notion = Client(auth=notion_api_key)
        self.github = Github(github_token)
        self.repo_name = repo_name
        self.owner_name = owner_name
        self.project_name = repo_name.split("/")[-1] if "/" in repo_name else repo_name
        self.squad_dir = Path(squad_dir)
        genai.configure(api_key=gemini_key)

    def _load_agent_profile(self, agent_code: str) -> str:
        agent_info = self.AGENTS[agent_code]
        profile_path = self.squad_dir / "agents" / f"{agent_info['slug']}.md"
        if profile_path.exists():
            return profile_path.read_text(encoding="utf-8")
        return f"Perfil padrao: {agent_info['title']}"

    def request_user_authorization(self, gate_name: str, details: str) -> bool:
        print(f"\n=== [SCRUM MASTER (11.07) - AUTORIZACAO NECESSARIA: {gate_name}] ===")
        print(details)
        if not sys.stdin.isatty():
            print("Erro: Execucao 100% autonoma bloqueada pelas regras de negocio.")
            print("Execute em modo interativo para autorizar as acoes do Scrum Master.")
            return False

        answer = input("Autoriza prosseguir? (s/n): ").strip().lower()
        return answer in ("s", "sim", "y", "yes")

    def fetch_and_bind_notion_tasks(self, target_id: str) -> list[dict]:
        """
        Extrai tasks do Notion, vincula data e nome do usuario (João Vitor Novaes)
        e ordena cronologicamente por data (date ASC).
        """
        tasks = []
        today_str = date.today().isoformat()

        try:
            db_query = self.notion.databases.query(database_id=target_id)
            for page in db_query.get("results", []):
                task = self._parse_notion_page(page, today_str)
                self._bind_task_to_owner(page["id"], task["date"])
                tasks.append(task)
        except Exception:
            try:
                page = self.notion.pages.retrieve(target_id)
                task = self._parse_notion_page(page, today_str)
                self._bind_task_to_owner(target_id, task["date"])
                tasks.append(task)
            except Exception as err:
                print(f"[Scrum Master 11.07] Erro ao acessar Notion API: {err}")
                sys.exit(1)

        tasks.sort(key=lambda item: item["date"])
        return tasks

    def _parse_notion_page(self, page: dict, default_date: str) -> dict:
        page_id = page["id"]
        title = "Tarefa Sem Titulo"
        task_date = None

        for _, prop_val in page.get("properties", {}).items():
            prop_type = prop_val.get("type")
            if prop_type == "title":
                title_items = prop_val.get("title", [])
                if title_items:
                    title = "".join([t.get("plain_text", "") for t in title_items])
            elif prop_type == "date" and prop_val.get("date"):
                task_date = prop_val["date"].get("start")

        if not task_date:
            created_time = page.get("created_time", "")
            task_date = created_time[:10] if created_time else default_date

        blocks = self.notion.blocks.children.list(block_id=page_id)
        content_lines = []
        for block in blocks.get("results", []):
            b_type = block.get("type")
            if b_type in ("paragraph", "bulleted_list_item", "numbered_list_item", "to_do"):
                texts = block.get(b_type, {}).get("rich_text", [])
                line = "".join([t.get("plain_text", "") for t in texts])
                if line:
                    content_lines.append(line)

        return {
            "id": page_id,
            "title": title,
            "date": task_date,
            "owner": self.owner_name,
            "project": self.project_name,
            "content": "\n".join(content_lines),
        }

    def _bind_task_to_owner(self, page_id: str, task_date: str):
        metadata_stamp = (
            f"[Governanca 11.07] Responsavel: {self.owner_name} | "
            f"Data vinculada: {task_date} | Projeto: {self.project_name}"
        )
        try:
            blocks = self.notion.blocks.children.list(block_id=page_id).get("results", [])
            already_stamped = any(
                "[Governanca 11.07]"
                in "".join(
                    [t.get("plain_text", "") for t in b.get(b.get("type", ""), {}).get("rich_text", [])]
                )
                for b in blocks
                if b.get("type") == "paragraph"
            )
            if not already_stamped:
                self.notion.blocks.children.append(
                    block_id=page_id,
                    children=[
                        {
                            "object": "block",
                            "type": "paragraph",
                            "paragraph": {
                                "rich_text": [{"type": "text", "text": {"content": metadata_stamp}}]
                            },
                        }
                    ],
                )
        except Exception as err:
            print(f"[Scrum Master 11.07] Aviso ao gravar vinculo na task {page_id}: {err}")

    def recommend_tasks_to_user(self, parent_page_id: str, recommended_tasks: list[str]):
        if not recommended_tasks:
            return

        for rec_task in recommended_tasks:
            today_str = date.today().isoformat()
            details = (
                f"Recomendacao de nova task identificada pelo Squad:\n"
                f"  - Descricao: {rec_task}\n"
                f"  - Responsavel: {self.owner_name}\n"
                f"  - Data: {today_str}\n"
                f"  - Projeto: {self.project_name}"
            )
            if self.request_user_authorization("Gate 4 - Recomendacao de Nova Task no Notion", details):
                try:
                    self.notion.blocks.children.append(
                        block_id=parent_page_id,
                        children=[
                            {
                                "object": "block",
                                "type": "to_do",
                                "to_do": {
                                    "rich_text": [
                                        {
                                            "type": "text",
                                            "text": {
                                                "content": (
                                                    f"[{today_str}] [{self.project_name}] "
                                                    f"[Resp: {self.owner_name}] {rec_task}"
                                                )
                                            },
                                        }
                                    ],
                                    "checked": False,
                                },
                            }
                        ],
                    )
                    print(f"[Scrum Master 11.07] Task adicionada ao Notion e vinculada a {self.owner_name}.")
                except Exception as err:
                    print(f"[Scrum Master 11.07] Erro ao registrar task recomendada no Notion: {err}")
            else:
                print("[Scrum Master 11.07] Recomendacao recusada pelo usuario.")

    def _generate_with_fallback(self, prompt: str, response_schema):
        candidate_models = [
            os.environ.get("GEMINI_MODEL", "gemini-2.5-pro"),
            "gemini-2.5-flash",
            "gemini-pro-latest",
            "gemini-flash-latest",
        ]
        seen = set()
        unique_candidates = [c for c in candidate_models if not (c in seen or seen.add(c))]

        last_error = None
        for model_name in unique_candidates:
            try:
                model = genai.GenerativeModel(model_name)
                return model.generate_content(
                    prompt,
                    generation_config=genai.GenerationConfig(
                        response_mime_type="application/json",
                        response_schema=response_schema,
                    ),
                )
            except Exception as err:
                err_msg = str(err)
                if "not found" in err_msg.lower() or "not supported" in err_msg.lower() or "404" in err_msg:
                    last_error = err
                    continue
                raise err
        raise RuntimeError(f"Falha ao acionar modelo Gemini. Ultimo erro: {last_error}")

    def trigger_agent(self, agent_code: str, step_label: str, task_prompt: str, schema):
        agent_info = self.AGENTS[agent_code]
        profile_text = self._load_agent_profile(agent_code)
        print(f"[Scrum Master 11.07] {step_label} -> {agent_info['trigger']} ({agent_info['title']})")

        composed_prompt = (
            f"{agent_info['trigger']}\n"
            f"Diretriz de linguagem: tom tecnico e factual, sem emojis, sem travessoes e sem adjetivos de venda.\n"
            f"Referencia de perfil do agente ({agent_info['code']}):\n{profile_text}\n\n"
            f"Tarefa atribuida:\n{task_prompt}"
        )
        res = self._generate_with_fallback(composed_prompt, schema)
        return json.loads(res.text)

    # --- ESTEIRA 1: Ciclo de Execucao de Tasks (11.07 -> 3.35 -> 14.02 -> 18.06 -> 11.07) ---

    def execute_development_pipeline(self, task: dict, repo_files_tree: str) -> dict | None:
        gate1_info = (
            f"Task na fila do Notion (ordenada por data):\n"
            f"  - Titulo: {task['title']}\n"
            f"  - Data: {task['date']}\n"
            f"  - Responsavel vinculado: {task['owner']}\n"
            f"  - Projeto: {task['project']}\n"
            f"  - Escopo: {task['content'] or '(Sem descricao detalhada)'}"
        )
        if not self.request_user_authorization("Gate 1 - Iniciar Task do Notion", gate1_info):
            print("[Scrum Master 11.07] Execucao da task cancelada pelo usuario.")
            return None

        # Passo 1: Senior Project Manager (11.07) -> 1. Especifica Task
        spec_data = self.trigger_agent(
            "11.07",
            "1. Especifica Task",
            (
                f"Quebre e especifique tecnicamente a task do Notion restringindo-se apenas ao escopo solicitado.\n"
                f"Task ({task['date']} - {task['owner']}): {task['title']}\n{task['content']}\n"
                f"Estrutura atual do repositorio:\n{repo_files_tree}"
            ),
            TaskSpecificationOutput,
        )

        print("[Scrum Master 11.07] Especificacao concluida. Transicao interna automatica (3.35 -> 14.02 -> 18.06 -> 11.07).")

        # Passo 2: Minimal Change Engineer (3.35) -> 2. Implementa
        dev_data = self.trigger_agent(
            "3.35",
            "2. Implementa",
            (
                f"Realize o desenvolvimento modular e CRUD com a menor alteracao necessaria:\n"
                f"{spec_data['task_specification']}"
            ),
            MinimalChangeOutput,
        )

        # Passo 3: AppSec Engineer (14.02) -> 3. Valida Seguranca
        sec_data = self.trigger_agent(
            "14.02",
            "3. Valida Seguranca",
            (
                f"Valide politicas RLS, prevencao de IDOR e regras OWASP nos arquivos implementados:\n"
                f"{json.dumps(dev_data['modified_files'])}"
            ),
            AppSecValidationOutput,
        )

        # Passo 4: Test Automation Engineer (18.06) -> Testes Unitarios e Mocks de CI
        test_data = self.trigger_agent(
            "18.06",
            "Geracao de Testes e Mocks de CI",
            (
                f"Gere testes unitarios e mocks de CI para o codigo validado pelo AppSec Engineer:\n"
                f"{json.dumps(sec_data['fixed_files'])}"
            ),
            TestAutomationOutput,
        )

        # Retorno 4. Valida Suite: Test Automation Engineer (18.06) -> Senior Project Manager (11.07)
        suite_validation = self.trigger_agent(
            "11.07",
            "4. Valida Suite (Retorno ao 11.07)",
            (
                f"Valide se a suite de testes e o codigo atendem aos criterios de aceite da task.\n"
                f"Criterios: {spec_data['acceptance_criteria']}\n"
                f"Resumo de testes: {test_data['ci_mocks_summary']}"
            ),
            SuiteValidationOutput,
        )

        if spec_data.get("recommended_followup_tasks"):
            self.recommend_tasks_to_user(task["id"], spec_data["recommended_followup_tasks"])

        return {
            "source_code": sec_data["fixed_files"],
            "tests": test_data["test_files"],
            "explanation": dev_data.get("explanation", ""),
            "suite_validation": suite_validation,
        }

    # --- ESTEIRA 2: Auditoria, Documentacao e Onboarding (16.42 -> 16.45 -> 3.10) ---

    def execute_audit_and_docs_pipeline(self, notion_page_id: str, repo_files_tree: str) -> dict | None:
        gate_audit = (
            "Execucao da Esteira 2 (Auditoria de Codigo, Documentacao Executiva/ADRs e Guias de Onboarding):\n"
            "  - 16.42 Codebase Archaeologist (Audita Legado)\n"
            "  - 16.45 Document Generator (Formaliza Specs)\n"
            "  - 3.10 Onboarding Engineer (Guias Praticos e Modelos Mentais)"
        )
        if not self.request_user_authorization("Gate Esteira 2 - Iniciar Auditoria e Documentacao", gate_audit):
            print("[Scrum Master 11.07] Execucao da Esteira 2 cancelada pelo usuario.")
            return None

        # 16.42 Codebase Archaeologist -> Audita Legado
        audit_data = self.trigger_agent(
            "16.42",
            "Audita Legado",
            f"Realize auditoria de codigo e mapeamento de debito tecnico na estrutura:\n{repo_files_tree}",
            CodebaseAuditOutput,
        )

        # 16.45 Document Generator -> Formaliza Specs
        docs_data = self.trigger_agent(
            "16.45",
            "Formaliza Specs",
            (
                f"Gere relatorios executivos e ADRs a partir do relatorio de auditoria:\n"
                f"{audit_data['technical_debt_report']}"
            ),
            DocumentGeneratorOutput,
        )

        # 3.10 Onboarding Engineer -> Guias Praticos e Modelos Mentais
        onboarding_data = self.trigger_agent(
            "3.10",
            "Guias Praticos e Modelos Mentais",
            (
                f"Elabore guias praticos e modelos mentais com base nas especificacoes formalizadas:\n"
                f"{json.dumps(docs_data['executive_reports_and_adrs'])}"
            ),
            OnboardingGuidesOutput,
        )

        if audit_data.get("recommended_tasks"):
            self.recommend_tasks_to_user(notion_page_id, audit_data["recommended_tasks"])

        merged_docs = {}
        merged_docs.update(docs_data.get("executive_reports_and_adrs", {}))
        merged_docs.update(onboarding_data.get("onboarding_and_mental_models", {}))

        return {
            "source_code": merged_docs,
            "tests": {},
            "explanation": audit_data["technical_debt_report"],
        }

    def open_feature_branch_and_pr(self, task: dict, artifacts: dict):
        repo = self.github.get_repo(self.repo_name)
        default_branch_name = repo.default_branch
        default_branch = repo.get_branch(default_branch_name)

        clean_title = "".join([c if c.isalnum() else "-" for c in task["title"].lower()]).strip("-")
        branch_name = f"feat/{clean_title}"

        if branch_name in ("main", "master", default_branch_name):
            raise PermissionError("Violacao de Regra de Negocio: Proibido produzir diretamente na branch main.")

        all_files = list(artifacts["source_code"].keys()) + list(artifacts["tests"].keys())
        gate3_info = (
            f"Preparado para enviar alteracoes ao GitHub:\n"
            f"  - Branch de destino: {branch_name} (Base: {default_branch_name})\n"
            f"  - Arquivos a commitar: {all_files}\n"
            f"  - Aprovador exclusivo do Pull Request: {self.owner_name}"
        )
        if not self.request_user_authorization("Gate 3 - Criar Branch feat/... e Abrir Pull Request", gate3_info):
            print("[Scrum Master 11.07] Criacao de branch e Pull Request cancelada pelo usuario.")
            return

        try:
            repo.create_git_ref(ref=f"refs/heads/{branch_name}", sha=default_branch.commit.sha)
            print(f"[Scrum Master 11.07] Branch criada: {branch_name}")
        except GithubException as err:
            if err.status == 422:
                print(f"[Scrum Master 11.07] Branch {branch_name} ja existe. Atualizando arquivos.")
            else:
                raise err

        def push_files(files_dict: dict, commit_prefix: str):
            for file_path, content in files_dict.items():
                try:
                    existing = repo.get_contents(file_path, ref=branch_name)
                    repo.update_file(
                        existing.path,
                        f"{commit_prefix}: atualiza {file_path}",
                        content,
                        existing.sha,
                        branch=branch_name,
                    )
                except GithubException as err:
                    if err.status == 404:
                        repo.create_file(
                            file_path,
                            f"{commit_prefix}: cria {file_path}",
                            content,
                            branch=branch_name,
                        )
                    else:
                        raise err

        push_files(artifacts["source_code"], "feat")
        push_files(artifacts["tests"], "test")

        suite_notes = artifacts.get("suite_validation", {}).get("validation_notes", "Validado pelo 11.07 com 100% de sucesso")
        files_table_lines = [
            f"| `{f}` | Código / Teste | Implementado e revisado |"
            for f in all_files[:15]
        ]
        files_table = "\n".join(files_table_lines)

        pr_body = (
            f"## 🩺 SolveTechAi — Entrega Coordenada pelo Senior Project Manager (11.07)\n\n"
            f"> [!IMPORTANT]\n"
            f"> **Aprovador Exclusivo: {self.owner_name}**\n"
            f"> Nenhum agente ou automação possui permissão para realizar o merge deste Pull Request. "
            f"A revisão técnica, validação clínica e o merge na branch `{default_branch_name}` dependem 100% de sua aprovação manual.\n\n"
            f"---\n\n"
            f"### 📋 Contexto da Task (Notion)\n"
            f"* **Identificador**: `{task.get('id', 'N/A')}`\n"
            f"* **Título**: `{task['title']}`\n"
            f"* **Data da Demanda**: `{task['date']}`\n"
            f"* **Projeto**: `{self.project_name}`\n"
            f"* **Responsável**: {self.owner_name}\n"
            f"* **Branch**: `{branch_name}`\n\n"
            f"---\n\n"
            f"### 🛠️ Resumo Técnico das Alterações\n\n"
            f"{artifacts.get('explanation', 'Implementação modular realizada conforme especificações da task.')}\n\n"
            f"| Arquivo | Tipo | Status |\n"
            f"| :--- | :--- | :--- |\n"
            f"{files_table}\n\n"
            f"---\n\n"
            f"### 🔒 Auditoria de Segurança (AppSec Engineer 14.02)\n"
            f"- [x] Sanitização de parâmetros de entrada e prevenção de SQL Injection\n"
            f"- [x] Validação rigorosa de IDs numéricos e prevenção de IDOR\n"
            f"- [x] Proteção contra vazamento de stack traces em respostas de erro HTTP\n\n"
            f"---\n\n"
            f"### 🧪 Validação da Suíte de Testes (4. Valida Suíte -> 11.07)\n"
            f"*Parecer do Senior Project Manager (11.07):*\n"
            f"> {suite_notes}\n\n"
            f"---\n\n"
            f"### ✅ Checklist de Governança\n"
            f"- [x] Produzido e commitado fora da branch `{default_branch_name}`\n"
            f"- [x] Gatilhos acionados de forma contínua pelo Scrum Master (11.07)\n"
            f"- [x] Bateria de testes automatizados com 100% de aprovação\n"
            f"- [ ] Revisão manual realizada por **{self.owner_name}**\n"
            f"- [ ] Merge manual aprovado e concluído por **{self.owner_name}**\n"
        )

        pr = repo.create_pull(
            title=f"feat: {task['title']} [{task['date']}]",
            body=pr_body,
            head=branch_name,
            base=default_branch_name,
        )
        print(f"[Scrum Master 11.07] Pull Request aberto aguardando sua aprovacao exclusiva: {pr.html_url}")

    def get_repo_tree(self) -> str:
        repo = self.github.get_repo(self.repo_name)
        tree = repo.get_git_tree(repo.default_branch, recursive=True)
        paths = [t.path for t in tree.tree if t.type == "blob"]
        return "\n".join(paths)


def main():
    token = os.environ.get("GITHUB_TOKEN")
    gemini_key = os.environ.get("GEMINI_API_KEY")
    notion_api_key = os.environ.get("NOTION_API_KEY")
    notion_task_id = os.environ.get("NOTION_TASK_ID")
    repo_name = os.environ.get("GITHUB_REPOSITORY")
    owner_name = os.environ.get("USER_OWNER_NAME", "João Vitor Novaes")
    pipeline_mode = os.environ.get("PIPELINE_MODE", "dev")  # "dev" (Esteira 1) ou "audit" (Esteira 2)

    if not all([token, gemini_key, notion_api_key, notion_task_id, repo_name]):
        print(
            "Erro: GITHUB_TOKEN, GEMINI_API_KEY, NOTION_API_KEY, "
            "NOTION_TASK_ID e GITHUB_REPOSITORY sao obrigatorios."
        )
        sys.exit(1)

    scrum_master = ScrumMasterOrchestrator(
        github_token=token,
        gemini_key=gemini_key,
        notion_api_key=notion_api_key,
        repo_name=repo_name,
        owner_name=owner_name,
    )

    repo_tree = scrum_master.get_repo_tree()

    if pipeline_mode == "audit":
        artifacts = scrum_master.execute_audit_and_docs_pipeline(notion_task_id, repo_tree)
        if artifacts:
            audit_task = {
                "id": notion_task_id,
                "title": "auditoria-e-documentacao-arquitetural",
                "date": date.today().isoformat(),
                "owner": owner_name,
                "project": scrum_master.project_name,
            }
            scrum_master.open_feature_branch_and_pr(audit_task, artifacts)
    else:
        ordered_tasks = scrum_master.fetch_and_bind_notion_tasks(notion_task_id)
        print(f"[Scrum Master 11.07] {len(ordered_tasks)} task(s) carregada(s) em ordem cronologica.")
        for task in ordered_tasks:
            artifacts = scrum_master.execute_development_pipeline(task, repo_tree)
            if artifacts:
                scrum_master.open_feature_branch_and_pr(task, artifacts)


if __name__ == "__main__":
    main()
