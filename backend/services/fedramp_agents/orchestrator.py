from ssp_agent import SSPAgent
from bloom_agent import BloomAgent
from training_agent import TrainingAgent

def generate_training(ssp_text, roles):
    ssp_agent = SSPAgent()
    bloom_agent = BloomAgent()
    training_agent = TrainingAgent()

    # 1️⃣ Map controls to roles
    role_mapping = ssp_agent.run(
        f"SSP:\n{ssp_text}\n\nRoles:\n{roles}"
    )

    # 2️⃣ Determine Bloom’s level
    blooms_output = bloom_agent.run(role_mapping)

    # 3️⃣ Generate training
    training_output = training_agent.run(blooms_output)

    return training_output