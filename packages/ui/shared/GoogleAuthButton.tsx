const GoogleAuthButton = () => {
  const handleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  return (
    <button
      onClick={handleLogin}
      className="relative block bg-primary text-primary-foreground px-8 py-3 rounded-xl text-base font-semibold"
    >
      Get Started
    </button>
  );
};

export default GoogleAuthButton;