import ast
import sys
from dataclasses import dataclass
from pathlib import Path

MAX_FILE_LINES = 300
MAX_FUNCTION_LINES = 50
MAX_NESTING_DEPTH = 3
SOURCE_DIRECTORIES = ("app", "tests", "scripts")
CONTROL_NODES = (
    ast.If,
    ast.For,
    ast.AsyncFor,
    ast.While,
    ast.Try,
    ast.With,
    ast.AsyncWith,
    ast.Match,
)


@dataclass(frozen=True, slots=True)
class Violation:
    path: Path
    line: int
    message: str

    def render(self, root: Path) -> str:
        relative_path = self.path.relative_to(root)
        return f"{relative_path}:{self.line}: {self.message}"


class StructureVisitor(ast.NodeVisitor):
    def __init__(self, path: Path) -> None:
        self.path = path
        self.depth = 0
        self.violations: list[Violation] = []

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        self._check_function_length(node)
        self.generic_visit(node)

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
        self._check_function_length(node)
        self.generic_visit(node)

    def generic_visit(self, node: ast.AST) -> None:
        is_control_node = isinstance(node, CONTROL_NODES)
        if is_control_node:
            self.depth += 1
            self._check_nesting(node)
        super().generic_visit(node)
        if is_control_node:
            self.depth -= 1

    def _check_function_length(
        self,
        node: ast.FunctionDef | ast.AsyncFunctionDef,
    ) -> None:
        end_line = node.end_lineno or node.lineno
        line_count = end_line - node.lineno + 1
        if line_count > MAX_FUNCTION_LINES:
            self.violations.append(
                Violation(
                    path=self.path,
                    line=node.lineno,
                    message=(
                        f"function '{node.name}' has {line_count} lines; "
                        f"maximum is {MAX_FUNCTION_LINES}"
                    ),
                )
            )

    def _check_nesting(self, node: ast.AST) -> None:
        if self.depth <= MAX_NESTING_DEPTH:
            return
        self.violations.append(
            Violation(
                path=self.path,
                line=getattr(node, "lineno", 1),
                message=(
                    f"control-flow nesting depth is {self.depth}; maximum is {MAX_NESTING_DEPTH}"
                ),
            )
        )


def analyze_file(path: Path) -> list[Violation]:
    source = path.read_text(encoding="utf-8")
    violations: list[Violation] = []
    line_count = len(source.splitlines())
    if line_count > MAX_FILE_LINES:
        violations.append(
            Violation(
                path=path,
                line=1,
                message=f"file has {line_count} lines; maximum is {MAX_FILE_LINES}",
            )
        )
    visitor = StructureVisitor(path)
    visitor.visit(ast.parse(source, filename=str(path)))
    return [*violations, *visitor.violations]


def source_files(root: Path) -> list[Path]:
    return sorted(
        file_path
        for directory in SOURCE_DIRECTORIES
        for file_path in (root / directory).rglob("*.py")
    )


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    violations = [
        violation for file_path in source_files(root) for violation in analyze_file(file_path)
    ]
    if not violations:
        return 0
    rendered = "\n".join(violation.render(root) for violation in violations)
    sys.stderr.write(f"{rendered}\n")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
