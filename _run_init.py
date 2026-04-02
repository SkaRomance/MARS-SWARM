import subprocess
import json

json_data = {
    "core": {
        "user_name": "BMad",
        "communication_language": "Italiano",
        "document_output_language": "Italiano",
        "output_folder": "_bmad-output"
    }
}

result = subprocess.run(
    [
        "python",
        r"C:\Users\Salvatore\.agents\skills\bmad-init\scripts\bmad_init.py",
        "write",
        "--answers", json.dumps(json_data),
        "--project-root", r"C:\Users\Salvatore\swarm"
    ],
    capture_output=True,
    text=True
)
print(result.stdout)
print(result.stderr)
