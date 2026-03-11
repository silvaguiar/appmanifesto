// Login Page Component

export function renderLogin() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="login-container">
            <div class="login-card">
                <div class="login-header">
                    <div class="login-logo">
                        <i class="fa-solid fa-route"></i>
                    </div>
                    <h1>MDF-e</h1>
                    <span>Sistema de Emissão</span>
                </div>
                
                <form id="login-form" class="login-form">
                    <div class="form-group">
                        <label class="form-label" for="username">Usuário</label>
                        <div class="input-icon">
                            <i class="fa-solid fa-user"></i>
                            <input type="text" class="form-control" id="username" placeholder="Seu login" required autocomplete="off">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label" for="password">Senha</label>
                        <div class="input-icon">
                            <i class="fa-solid fa-lock"></i>
                            <input type="password" class="form-control" id="password" placeholder="Sua senha" required>
                        </div>
                    </div>
                    
                    <div id="login-error" class="login-error" style="display: none;">
                        Usuário ou senha incorretos.
                    </div>
                    
                    <button type="submit" class="btn-primary login-btn">
                        <span>Acessar Sistema</span>
                        <i class="fa-solid fa-arrow-right"></i>
                    </button>
                </form>
                
                <div class="login-footer">
                    &copy; ${new Date().getFullYear()} Sistema MDF-e
                </div>
            </div>
        </div>
    `;

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = document.getElementById('username').value;
        const pass = document.getElementById('password').value;
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Acessando...';

        const success = await window.handleLogin(user, pass);
        if (!success) {
            document.getElementById('login-error').style.display = 'block';
            btn.disabled = false;
            btn.innerHTML = '<span>Acessar Sistema</span><i class="fa-solid fa-arrow-right"></i>';
        }
    });
}

